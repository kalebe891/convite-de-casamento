import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for check-in validation - accepts email, phone, or generic identifier
const checkinItemSchema = z.object({
  guest_id: z.string().uuid().optional(),
  guest_email: z.string().optional(), // Can be email or phone
  checked_in_at: z.string().nullable(),
  source: z.enum(['offline', 'online']),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.guest_id || data.guest_email,
  { message: 'Either guest_id or guest_email is required' }
);

const syncCheckinSchema = z.object({
  wedding_id: z.string().uuid({ message: 'wedding_id é obrigatório' }),
  checks: z.array(checkinItemSchema).min(1),
});

// Rate limiting map (in-memory, simple implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 30) {
    return false;
  }

  limit.count++;
  return true;
}

function getIdentifier(check: { guest_id?: string; guest_email?: string }): string {
  return check.guest_email || check.guest_id || 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Role check (legacy permission flow, kept for backwards compat)
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData?.role) {
      throw new Error('Insufficient permissions');
    }

    if (roleData.role !== 'admin') {
      const { data: permData } = await supabaseAdmin
        .from('admin_permissions')
        .select('can_view, can_edit')
        .eq('role_key', roleData.role)
        .eq('menu_key', 'checkin')
        .maybeSingle();

      if (!permData?.can_view) {
        throw new Error('Insufficient permissions');
      }
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validationResult = syncCheckinSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { wedding_id: weddingId, checks } = validationResult.data;

    // Multi-tenant access validation
    const { data: hasAccess, error: accessErr } = await supabaseAdmin.rpc(
      'user_has_wedding_access',
      { _user_id: user.id, _wedding_id: weddingId }
    );

    if (accessErr || !hasAccess) {
      console.error('[sync-checkin] Access denied to wedding:', weddingId);
      throw new Error('Insufficient permissions');
    }

    const results: { successCount: number; failed: Array<{ identifier: string; reason: string }> } = {
      successCount: 0,
      failed: [],
    };

    for (const check of checks) {
      const identifier = getIdentifier(check);

      try {
        let guest = null;

        // All guest lookups are scoped by wedding_id
        if (check.guest_id) {
          const result = await supabaseAdmin
            .from('guests')
            .select('id, email, phone, status, checked_in_at, wedding_id')
            .eq('id', check.guest_id)
            .eq('wedding_id', weddingId)
            .maybeSingle();
          guest = result.data;
        }

        if (!guest && check.guest_email) {
          const emailResult = await supabaseAdmin
            .from('guests')
            .select('id, email, phone, status, checked_in_at, wedding_id')
            .eq('email', check.guest_email)
            .eq('wedding_id', weddingId)
            .maybeSingle();

          if (emailResult.data) {
            guest = emailResult.data;
          } else {
            const phoneResult = await supabaseAdmin
              .from('guests')
              .select('id, email, phone, status, checked_in_at, wedding_id')
              .eq('phone', check.guest_email)
              .eq('wedding_id', weddingId)
              .maybeSingle();
            guest = phoneResult.data;
          }
        }

        if (!guest) {
          results.failed.push({ identifier, reason: 'Guest not found' });
          continue;
        }

        const isUndo = check.checked_in_at === null;
        const guestIdentifierForLog = guest.email || guest.phone || identifier;

        if (isUndo) {
          let previousStatus = 'pending';

          const { data: logData } = await supabaseAdmin
            .from('admin_logs')
            .select('old_data')
            .eq('record_id', guest.id)
            .eq('action', 'checkin')
            .eq('table_name', 'guests')
            .eq('wedding_id', weddingId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (logData?.old_data && typeof logData.old_data === 'object' && 'status' in logData.old_data) {
            previousStatus = (logData.old_data as Record<string, unknown>).status as string || 'pending';
          }

          const { error: updateError } = await supabaseAdmin
            .from('guests')
            .update({ checked_in_at: null, status: previousStatus })
            .eq('id', guest.id)
            .eq('wedding_id', weddingId);

          if (updateError) {
            results.failed.push({ identifier, reason: updateError.message });
            continue;
          }

          // Update invitations scoped by wedding
          if (guest.email) {
            await supabaseAdmin.from('invitations')
              .update({ checked_in_at: null })
              .eq('guest_email', guest.email)
              .eq('wedding_id', weddingId);
          }
          if (guest.phone) {
            await supabaseAdmin.from('invitations')
              .update({ checked_in_at: null })
              .eq('guest_phone', guest.phone)
              .eq('wedding_id', weddingId);
          }

          await supabaseAdmin.from('admin_logs').insert({
            user_id: user.id,
            user_email: user.email,
            action: 'undo_checkin',
            table_name: 'guests',
            record_id: guest.id,
            wedding_id: weddingId,
            old_data: { checked_in_at: guest.checked_in_at, status: guest.status },
            new_data: { checked_in_at: null, status: previousStatus },
          });

          results.successCount++;
          continue;
        }

        // Regular check-in conflict logic
        const existingCheckin = guest.checked_in_at;
        const incomingTimestamp = new Date(check.checked_in_at as string);
        let conflictMetadata: Record<string, unknown> = check.metadata || {};
        let shouldUpdate = true;

        if (existingCheckin) {
          const existingTimestamp = new Date(existingCheckin);

          if (incomingTimestamp > existingTimestamp) {
            conflictMetadata = {
              ...conflictMetadata,
              conflict: true,
              reason: 'duplicate',
              kept: 'existing',
              existing_timestamp: existingCheckin,
              incoming_timestamp: check.checked_in_at,
            };
            shouldUpdate = false;

            await supabaseAdmin.from('checkin_logs').insert({
              guest_email: guestIdentifierForLog,
              guest_id: guest.id,
              wedding_id: weddingId,
              checked_in_at: check.checked_in_at,
              performed_by: user.id,
              source: check.source,
              metadata: conflictMetadata,
            });

            results.failed.push({ identifier, reason: 'Duplicate check-in - existing kept (older)' });
            continue;
          }

          if (incomingTimestamp < existingTimestamp) {
            conflictMetadata = {
              ...conflictMetadata,
              conflict: true,
              reason: 'older_offline',
              replaced: 'existing',
              existing_timestamp: existingCheckin,
              incoming_timestamp: check.checked_in_at,
            };
            shouldUpdate = true;
          }

          if (incomingTimestamp.getTime() === existingTimestamp.getTime()) {
            if (check.source === 'offline') {
              conflictMetadata = {
                ...conflictMetadata,
                conflict: true,
                reason: 'same_timestamp',
                kept: 'online',
                existing_timestamp: existingCheckin,
                incoming_timestamp: check.checked_in_at,
              };
              shouldUpdate = false;

              await supabaseAdmin.from('checkin_logs').insert({
                guest_email: guestIdentifierForLog,
                guest_id: guest.id,
                wedding_id: weddingId,
                checked_in_at: check.checked_in_at,
                performed_by: user.id,
                source: check.source,
                metadata: conflictMetadata,
              });

              results.failed.push({ identifier, reason: 'Same timestamp - online version kept' });
              continue;
            }
          }
        }

        if (shouldUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from('guests')
            .update({ checked_in_at: check.checked_in_at, status: 'confirmed' })
            .eq('id', guest.id)
            .eq('wedding_id', weddingId);

          if (updateError) {
            results.failed.push({ identifier, reason: updateError.message });
            continue;
          }

          if (guest.email) {
            await supabaseAdmin.from('invitations')
              .update({ checked_in_at: check.checked_in_at, attending: true })
              .eq('guest_email', guest.email)
              .eq('wedding_id', weddingId);
          }
          if (guest.phone) {
            await supabaseAdmin.from('invitations')
              .update({ checked_in_at: check.checked_in_at, attending: true })
              .eq('guest_phone', guest.phone)
              .eq('wedding_id', weddingId);
          }
        }

        const { error: logError } = await supabaseAdmin.from('checkin_logs').insert({
          guest_email: guestIdentifierForLog,
          guest_id: guest.id,
          wedding_id: weddingId,
          checked_in_at: check.checked_in_at,
          performed_by: user.id,
          source: check.source,
          metadata: conflictMetadata,
        });

        if (logError) {
          console.error('Failed to log check-in to checkin_logs:', logError);
        }

        const { error: adminLogError } = await supabaseAdmin.from('admin_logs').insert({
          user_id: user.id,
          user_email: user.email,
          action: 'checkin',
          table_name: 'guests',
          record_id: guest.id,
          wedding_id: weddingId,
          old_data: { checked_in_at: existingCheckin || null, status: guest.status || 'pending' },
          new_data: { checked_in_at: check.checked_in_at, status: 'confirmed' },
        });

        if (adminLogError) {
          console.error('Failed to log check-in to admin_logs:', adminLogError);
        }

        results.successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ identifier, reason: errorMessage });
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-checkin error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const isUnauthorized = errorMessage === 'Unauthorized' || errorMessage === 'Insufficient permissions';

    let safeErrorMessage = 'Erro ao processar check-ins';
    if (isUnauthorized) {
      safeErrorMessage = 'Não autorizado';
    }

    return new Response(
      JSON.stringify({ error: safeErrorMessage }),
      { status: isUnauthorized ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
