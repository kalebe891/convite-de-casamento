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
  selected_gift_id?: string;
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
    const { token, attending, plus_one, dietary_restrictions, message, selected_gift_id } = body as RespondRequest;

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

    if (selected_gift_id && typeof selected_gift_id !== 'string') {
      console.error('[rsvp-respond] ID de presente inválido');
      return new Response(
        JSON.stringify({ error: 'ID de presente inválido' }),
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
      .select('id, guest_name, responded_at')
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
    if (dietary_restrictions) updateData.dietary_restrictions = dietary_restrictions.trim();
    if (message) updateData.message = message.trim();

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

    // Se o convidado confirmou presença E selecionou um presente, vincular
    if (attending && selected_gift_id) {
      const { error: giftError } = await supabase
        .from('gift_items')
        .update({ selected_by_invitation_id: invitation.id })
        .eq('id', selected_gift_id)
        .is('selected_by_invitation_id', null); // Garantir que não foi selecionado por outro

      if (giftError) {
        console.warn('[rsvp-respond] Erro ao vincular presente (pode já ter sido selecionado):', giftError);
        // Não retornamos erro aqui pois o RSVP foi registrado com sucesso
      } else {
        console.log('[rsvp-respond] Presente vinculado:', selected_gift_id);
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
