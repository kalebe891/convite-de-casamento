import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectGiftRequest {
  invitation_id: string;
  gift_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body = await req.json();
    const { invitation_id, gift_id } = body as SelectGiftRequest;

    // Validação
    if (!invitation_id || typeof invitation_id !== 'string') {
      console.error('[select-gift] invitation_id obrigatório');
      return new Response(
        JSON.stringify({ error: 'Invitation ID obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[select-gift] Processando seleção para invitation:', invitation_id);

    // Verificar se convite existe
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, guest_name')
      .eq('id', invitation_id)
      .single();

    if (inviteError || !invitation) {
      console.error('[select-gift] Convite não encontrado:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se gift_id = null → desmarcar presente atual
    if (!gift_id) {
      console.log('[select-gift] Desmarcando presente para:', invitation.guest_name);
      
      const { error: clearError } = await supabase
        .from('gift_items')
        .update({ selected_by_invitation_id: null })
        .eq('selected_by_invitation_id', invitation_id);

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

    // Verificar se este convite já tem um presente selecionado
    const { data: existingGift, error: checkError } = await supabase
      .from('gift_items')
      .select('id, gift_name')
      .eq('selected_by_invitation_id', invitation_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[select-gift] Erro ao verificar presente existente:', checkError);
    }

    if (existingGift) {
      console.warn('[select-gift] Convite já possui presente selecionado:', existingGift.gift_name);
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
      .update({ selected_by_invitation_id: invitation_id })
      .eq('id', gift_id)
      .is('selected_by_invitation_id', null)
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

    console.log('[select-gift] Presente reservado com sucesso:', data[0].gift_name, 'para', invitation.guest_name);

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
