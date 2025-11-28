import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const requestSchema = z.object({
  token: z.string().uuid('Token inválido'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  full_name: z.string().min(1, 'Nome é obrigatório'),
});

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      console.error('[complete-user-invite] Validation error:', firstError);
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token, email, password, full_name } = validationResult.data;

    console.log('[complete-user-invite] Processing invite for:', email);

    // 1. Verify token exists and get pending user data
    const { data: pendingUser, error: pendingError } = await supabase
      .from('pending_users')
      .select('*')
      .eq('token', token)
      .eq('usado', false)
      .single();

    if (pendingError || !pendingUser) {
      console.error('[complete-user-invite] Invalid token:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Convite inválido ou já utilizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify email matches
    if (pendingUser.email !== email) {
      console.error('[complete-user-invite] Email mismatch');
      return new Response(
        JSON.stringify({ error: 'E-mail não corresponde ao convite' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token expired (48 hours from creation)
    const expiresAt = new Date(pendingUser.expires_at);
    const now = new Date();
    if (expiresAt <= now) {
      console.error('[complete-user-invite] Token expired at:', expiresAt, 'Current time:', now);
      return new Response(
        JSON.stringify({ 
          error: 'Convite expirado. Por favor, solicite um novo convite ao administrador.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create user with admin API
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    });

    if (createUserError || !newUser.user) {
      console.error('[complete-user-invite] Error creating user:', createUserError);
      
      // Handle specific errors
      if (createUserError?.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Este e-mail já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] User created:', newUser.user.id);

    // 3. Update profile with full name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name, email })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('[complete-user-invite] Error updating profile:', JSON.stringify(profileError, null, 2));
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil do usuário', details: profileError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] Profile updated successfully');

    // 4. Assign role to user
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: pendingUser.papel,
      });

    if (roleError) {
      console.error('[complete-user-invite] Error assigning role:', JSON.stringify(roleError, null, 2));
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir papel ao usuário', details: roleError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] Role assigned:', pendingUser.papel);

    // 5. Mark token as used and remove from pending_users
    const { error: deleteError } = await supabase
      .from('pending_users')
      .delete()
      .eq('token', token);

    if (deleteError) {
      console.error('[complete-user-invite] Error removing token:', JSON.stringify(deleteError, null, 2));
      return new Response(
        JSON.stringify({ error: 'Erro ao remover token de convite', details: deleteError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] Invitation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conta criada com sucesso!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[complete-user-invite] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
