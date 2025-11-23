import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for check-in validation
const checkinItemSchema = z.object({
  guest_id: z.string().uuid().optional(),
  guest_email: z.string().email(),
  checked_in_at: z.string(),
  source: z.enum(['offline', 'online']),
  metadata: z.record(z.unknown()).optional(),
});

const syncCheckinSchema = z.object({
  checks: z.array(checkinItemSchema),
});

// Rate limiting map (in-memory, simple implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 30) {
    return false; // Exceeded 30 requests per minute
  }

  limit.count++;
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user and role
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has required role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const allowedRoles = ['admin', 'couple', 'planner', 'cerimonial'];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      throw new Error('Insufficient permissions');
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate payload
    const body = await req.json();
    const validationResult = syncCheckinSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: validationResult.error.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { checks } = validationResult.data;

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results: { successCount: number; failed: Array<{ guest_email: string; reason: string }> } = {
      successCount: 0,
      failed: [],
    };

    // Process each check-in
    for (const check of checks) {
      try {
        // Find guest by email
        const { data: guest, error: guestError } = await supabaseAdmin
          .from('guests')
          .select('id, email, checked_in_at')
          .eq('email', check.guest_email)
          .maybeSingle();

        if (guestError || !guest) {
          results.failed.push({
            guest_email: check.guest_email,
            reason: 'Guest not found',
          });
          continue;
        }

        // Conflict resolution logic
        const existingCheckin = guest.checked_in_at;
        const incomingTimestamp = new Date(check.checked_in_at);
        let conflictMetadata = check.metadata || {};
        let shouldUpdate = true;

        if (existingCheckin) {
          const existingTimestamp = new Date(existingCheckin);
          
          // Rule 1: Incoming is newer than existing - keep existing (first check-in wins)
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

            // Log conflict without updating
            await supabaseAdmin.from('checkin_logs').insert({
              guest_email: check.guest_email,
              guest_id: guest.id,
              checked_in_at: check.checked_in_at,
              performed_by: user.id,
              source: check.source,
              metadata: conflictMetadata,
            });

            results.failed.push({
              guest_email: check.guest_email,
              reason: 'Duplicate check-in - existing kept (older)',
            });
            continue;
          }

          // Rule 2: Incoming is older - overwrite with older timestamp
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

          // Rule 3: Same timestamp - prioritize online source
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

              // Log conflict without updating
              await supabaseAdmin.from('checkin_logs').insert({
                guest_email: check.guest_email,
                guest_id: guest.id,
                checked_in_at: check.checked_in_at,
                performed_by: user.id,
                source: check.source,
                metadata: conflictMetadata,
              });

              results.failed.push({
                guest_email: check.guest_email,
                reason: 'Same timestamp - online version kept',
              });
              continue;
            }
          }
        }

        // Update guest check-in status if needed
        if (shouldUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from('guests')
            .update({
              checked_in_at: check.checked_in_at,
              status: 'confirmed',
            })
            .eq('id', guest.id);

          if (updateError) {
            results.failed.push({
              guest_email: check.guest_email,
              reason: updateError.message,
            });
            continue;
          }

          // Also update invitation if exists
          await supabaseAdmin
            .from('invitations')
            .update({
              checked_in_at: check.checked_in_at,
              attending: true,
            })
            .eq('guest_email', check.guest_email);
        }

        // Log check-in to audit table
        const { error: logError } = await supabaseAdmin.from('checkin_logs').insert({
          guest_email: check.guest_email,
          guest_id: guest.id,
          checked_in_at: check.checked_in_at,
          performed_by: user.id,
          source: check.source,
          metadata: conflictMetadata,
        });

        if (logError) {
          console.error('Failed to log check-in:', logError);
          // Continue anyway, check-in was successful
        }

        results.successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          guest_email: check.guest_email,
          reason: errorMessage,
        });
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
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: isUnauthorized ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
