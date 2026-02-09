import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectGiftRequest {
  guest_id: string;
  gift_id: string | null;
  // Legacy support
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

    // Legacy: if invitation_id provided but not guest_id, resolve it
    if (!guest_id && invitation_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: inv } = await supabase
        .from('invitations')
        .select('guest_id')
        .eq('id', invitation_id)
        .single();
      
      if (inv?.guest_id) {
        guest_id = inv.guest_id;
      }
    }

    if (!guest_id || typeof guest_id !== 'string') {
      console.error('[select-gift] guest_id obrigatório');
      return new Response(
        JSON.stringify({ error: 'Guest ID obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[select-gift] Processando seleção para guest:', guest_id);

    // Verificar se guest existe e não está arquivado
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name')
      .eq('id', guest_id)
      .is('archived_at', null)
      .single();

    if (guestError || !guest) {
      console.error('[select-gift] Guest não encontrado:', guestError);
      return new Response(
        JSON.stringify({ error: 'Convidado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se gift_id = null → desmarcar presente atual
    if (!gift_id) {
      console.log('[select-gift] Desmarcando presente para:', guest.name);
      
      const { error: clearError } = await supabase
        .from('gift_items')
        .update({ selected_by_guest_id: null, selected_by_invitation_id: null })
        .eq('selected_by_guest_id', guest_id);

      if (clearError) {
        console.error('[select-gift] Erro ao desmarcar presente:', clearError);
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

    // Verificar se este guest já tem um presente selecionado
    const { data: existingGift, error: checkError } = await supabase
      .from('gift_items')
      .select('id, gift_name')
      .eq('selected_by_guest_id', guest_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[select-gift] Erro ao verificar presente existente:', checkError);
    }

    if (existingGift) {
      console.warn('[select-gift] Guest já possui presente selecionado:', existingGift.gift_name);
      return new Response(
        JSON.stringify({ 
          error: 'Você já selecionou um presente. Para alterar, solicite um novo link.',
          current_gift: existingGift.gift_name
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[select-gift] Tentando reservar presente:', gift_id);

    // Tentar reservar presente que esteja disponível
    const { data, error } = await supabase
      .from('gift_items')
      .update({ selected_by_guest_id: guest_id, selected_by_invitation_id: null })
      .eq('id', gift_id)
      .is('selected_by_guest_id', null)
      .select('gift_name');

    if (error) {
      console.error('[select-gift] Erro ao reservar presente:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar seleção' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      console.warn('[select-gift] Presente indisponível:', gift_id);
      return new Response(
        JSON.stringify({ error: 'Presente indisponível. Alguém acabou de escolher este presente.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[select-gift] Presente reservado com sucesso:', data[0].gift_name, 'para', guest.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        gift_id,
        gift_name: data[0].gift_name
      }),
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
