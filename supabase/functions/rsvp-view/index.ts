import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationData {
  id: string;
  guest_name: string;
  attending: boolean | null;
  responded_at: string | null;
  plus_one: boolean | null;
  dietary_restrictions: string | null;
  message: string | null;
  wedding_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    // Validação de entrada
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      console.error('[rsvp-view] Token inválido ou ausente');
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato do token (deve ser alfanumérico)
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      console.error('[rsvp-view] Token com formato inválido');
      return new Response(
        JSON.stringify({ error: 'Formato de token inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[rsvp-view] Buscando convite com token:', token.substring(0, 8) + '...');

    // Buscar convite usando service role (bypass RLS)
    const { data, error } = await supabase
      .from('invitations')
      .select('id, guest_name, attending, responded_at, plus_one, dietary_restrictions, message, wedding_id')
      .eq('unique_code', token)
      .single();

    if (error || !data) {
      console.error('[rsvp-view] Convite não encontrado:', error);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado ou inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[rsvp-view] Convite encontrado para:', data.guest_name);

    // Retornar apenas dados necessários
    const response: InvitationData = {
      id: data.id,
      guest_name: data.guest_name,
      attending: data.attending,
      responded_at: data.responded_at,
      plus_one: data.plus_one,
      dietary_restrictions: data.dietary_restrictions,
      message: data.message,
      wedding_id: data.wedding_id,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[rsvp-view] Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
