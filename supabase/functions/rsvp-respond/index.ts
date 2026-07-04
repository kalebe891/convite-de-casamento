import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RespondRequest {
  token: string;
  attending: boolean;
  plus_one?: boolean;
  dietary_restrictions?: string;
  message?: string;
  gift_item_id?: string | null;
  pix_item_ids?: string[];
}

// Sanitize user input to prevent XSS and script injection
function sanitizeInput(input: string): string {
  if (!input) return input;
  
  // Remove potential script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*on\w+\s*=[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');
  
  // Encode HTML entities for display safety
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized.trim();
}

// Rate limiting simples: armazena IPs e timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  
  // Limpar requisições antigas
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      console.warn('[rsvp-respond] Rate limit excedido para IP:', clientIp);
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse e validação do body
    const body = await req.json();
    const { token, attending, plus_one, dietary_restrictions, message, gift_item_id, pix_item_ids } = body as RespondRequest;
    const safePixIds: string[] = Array.isArray(pix_item_ids)
      ? Array.from(new Set(pix_item_ids.filter((v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v))))
      : [];
    const safeGiftId: string | null =
      typeof gift_item_id === 'string' && /^[0-9a-f-]{36}$/i.test(gift_item_id) ? gift_item_id : null;

    // Validação de entrada básica
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      console.error('[rsvp-respond] Token inválido');
      return new Response(
        JSON.stringify({ error: 'Token é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof attending !== 'boolean') {
      console.error('[rsvp-respond] Status attending inválido');
      return new Response(
        JSON.stringify({ error: 'Status de presença inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato do token
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      console.error('[rsvp-respond] Formato de token inválido');
      return new Response(
        JSON.stringify({ error: 'Formato de token inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar campos opcionais
    if (dietary_restrictions && (typeof dietary_restrictions !== 'string' || dietary_restrictions.length > 500)) {
      console.error('[rsvp-respond] Restrições alimentares inválidas');
      return new Response(
        JSON.stringify({ error: 'Restrições alimentares devem ter no máximo 500 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message && (typeof message !== 'string' || message.length > 1000)) {
      console.error('[rsvp-respond] Mensagem inválida');
      return new Response(
        JSON.stringify({ error: 'Mensagem deve ter no máximo 1000 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[rsvp-respond] Processando resposta para token:', token.substring(0, 8) + '...');

    // Buscar convite
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, guest_id, guest_name, responded_at, wedding_id')
      .eq('unique_code', token)
      .single();

    if (fetchError || !invitation) {
      console.error('[rsvp-respond] Convite não encontrado:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado ou inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já foi respondido
    if (invitation.responded_at) {
      console.warn('[rsvp-respond] Convite já foi respondido:', invitation.guest_name);
      return new Response(
        JSON.stringify({ error: 'Este convite já foi respondido anteriormente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar convite
    const updateData: any = {
      attending,
      responded_at: new Date().toISOString(),
    };

    if (plus_one !== undefined) updateData.plus_one = plus_one;
    if (dietary_restrictions) updateData.dietary_restrictions = sanitizeInput(dietary_restrictions);
    if (message) updateData.message = sanitizeInput(message);

    const { error: updateError } = await supabase
      .from('invitations')
      .update(updateData)
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[rsvp-respond] Erro ao atualizar convite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Presente tradicional: usa RPC claim_gift (sem alterar regras existentes)
    if (attending && safeGiftId && invitation.guest_id) {
      try {
        const { data: claimResult, error: claimError } = await supabase.rpc('claim_gift', {
          p_gift_id: safeGiftId,
          p_guest_id: invitation.guest_id,
          p_allow_multiple: false,
        });
        if (claimError) {
          console.error('[rsvp-respond] Erro ao reservar presente:', claimError);
        } else {
          console.log('[rsvp-respond] Resultado claim_gift:', claimResult);
        }
      } catch (e) {
        console.error('[rsvp-respond] Exceção em claim_gift:', e);
      }
    }

    // PIX: registrar intenção de contribuição (lote). Validação dupla:
    // 1) gift_items são do mesmo wedding do convite; 2) são do tipo 'pix'.
    console.log('[DIAG 1.24.08] pix_item_ids', safePixIds);
    if (attending && safePixIds.length > 0 && invitation.guest_id && invitation.wedding_id) {
      // gift_kind canônico no banco é 'pix_manual' (não 'pix'). Filtro anterior
      // rejeitava 100% dos PIX e nada era gravado em gift_pix_selections.
      const { data: validPix, error: pixFetchError } = await supabase
        .from('gift_items')
        .select('id')
        .eq('wedding_id', invitation.wedding_id)
        .in('gift_kind', ['pix_manual', 'pix'])
        .in('id', safePixIds);

      if (pixFetchError) {
        console.error('[rsvp-respond] Erro ao validar PIX:', pixFetchError);
      } else if (validPix && validPix.length > 0) {
        const rows = validPix.map((p) => ({
          wedding_id: invitation.wedding_id,
          guest_id: invitation.guest_id,
          gift_item_id: p.id,
        }));
        const { data: inserted, error: pixInsertError } = await supabase
          .from('gift_pix_selections')
          .upsert(rows, { onConflict: 'guest_id,gift_item_id', ignoreDuplicates: true })
          .select('id');
        if (pixInsertError) {
          console.error('[rsvp-respond] Erro ao registrar PIX:', pixInsertError);
        } else {
          console.log('[DIAG 1.24.08] insert count', inserted?.length ?? 0, '/ rows sent:', rows.length);
        }
      } else {
        console.warn('[DIAG 1.24.08] Nenhum PIX válido encontrado para os IDs:', safePixIds);
      }
    }

    console.log('[rsvp-respond] Resposta registrada com sucesso:', invitation.guest_name, '- Confirmado:', attending);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Resposta registrada com sucesso',
        guest_name: invitation.guest_name,
        attending 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[rsvp-respond] Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
