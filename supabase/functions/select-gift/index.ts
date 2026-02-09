import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectGiftRequest {
  guest_id: string;
  gift_id: string | null;
  invitation_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    let { guest_id, gift_id, invitation_id } = body as SelectGiftRequest;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Legacy: resolve invitation_id → guest_id
    if (!guest_id && invitation_id) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('guest_id')
        .eq('id', invitation_id)
        .single();
      if (inv?.guest_id) guest_id = inv.guest_id;
    }

    if (!guest_id || typeof guest_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Guest ID obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se guest existe e não está arquivado
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name')
      .eq('id', guest_id)
      .is('archived_at', null)
      .single();

    if (guestError || !guest) {
      return new Response(
        JSON.stringify({ error: 'Convidado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DESMARCAR presente
    if (!gift_id) {
      console.log('[select-gift] Desmarcando presente para:', guest.name);
      const { error: clearError } = await supabase.rpc('unclaim_gift', { p_guest_id: guest_id });

      if (clearError) {
        console.error('[select-gift] Erro ao desmarcar:', clearError);
        return new Response(
          JSON.stringify({ error: 'Erro ao desmarcar presente' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, cleared: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SELECIONAR presente via RPC atômica
    console.log('[select-gift] Tentando reservar presente:', gift_id, 'para', guest.name);

    const { data, error } = await supabase.rpc('claim_gift', {
      p_gift_id: gift_id,
      p_guest_id: guest_id,
    });

    if (error) {
      console.error('[select-gift] Erro na RPC claim_gift:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar seleção' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0];

    if (!result?.success) {
      if (result?.error_code === 'ALREADY_HAS_GIFT') {
        console.warn('[select-gift] Guest já possui presente:', result.gift_name);
        return new Response(
          JSON.stringify({
            error: 'Você já selecionou um presente. Para alterar, solicite um novo link.',
            current_gift: result.gift_name,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (result?.error_code === 'GIFT_UNAVAILABLE') {
        console.warn('[select-gift] Presente indisponível:', gift_id);
        return new Response(
          JSON.stringify({ error: 'Este presente acabou de ser selecionado por outro convidado.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[select-gift] Presente reservado:', result.gift_name, 'para', guest.name);

    return new Response(
      JSON.stringify({ success: true, gift_id, gift_name: result.gift_name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[select-gift] Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
