import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CompleteInvitationRequest {
  token: string;
  password: string;
  nome?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { token, password, nome }: CompleteInvitationRequest = await req.json();

    console.log('Processing invitation completion for token:', token);

    // Validate token
    const { data: pendingUser, error: fetchError } = await supabase
      .from('pending_users')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching pending user:', fetchError);
      throw new Error('Erro ao validar convite');
    }

    if (!pendingUser) {
      throw new Error('Convite não encontrado');
    }

    if (pendingUser.usado) {
      throw new Error('Este convite já foi utilizado');
    }

    if (new Date(pendingUser.expires_at) < new Date()) {
      throw new Error('Este convite expirou');
    }

    console.log('Token validated, creating user:', pendingUser.email);

    // Create user with admin API
    const finalNome = nome?.trim() || pendingUser.nome;
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: pendingUser.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: finalNome,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    console.log('User created:', newUser.user.id);

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: pendingUser.email,
        full_name: finalNome,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Non-blocking - trigger should handle this
    }

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: pendingUser.papel,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw new Error('Erro ao atribuir papel ao usuário');
    }

    console.log('Role assigned:', pendingUser.papel);

    // Mark token as used
    const { error: updateError } = await supabase
      .from('pending_users')
      .update({ usado: true })
      .eq('token', token);

    if (updateError) {
      console.error('Error marking token as used:', updateError);
      // Non-blocking
    }

    console.log('Invitation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conta criada com sucesso! Você pode fazer login agora.',
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in complete-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
