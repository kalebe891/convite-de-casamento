import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security helpers
const maskToken = (token: string): string => token ? token.slice(0, 8) + '...(hidden)' : 'N/A';
const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '***@' + domain;
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

  const isDev = Deno.env.get("ENVIRONMENT") !== "production";

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

    if (isDev) {
      console.log('[complete-user-invite] Processing invite for:', maskEmail(email));
      console.log('[complete-user-invite] Token:', maskToken(token));
    }

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

    if (isDev) {
      console.log('[complete-user-invite] Pending user found:', {
        email: maskEmail(pendingUser.email),
        role: pendingUser.papel,
        used: pendingUser.usado
      });
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

    // 2. Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      console.log('[complete-user-invite] User already exists, updating credentials:', existingUser.id);
      
      // Update existing user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password,
          email_confirm: true,
          user_metadata: { full_name }
        }
      );
      
      if (updateError) {
        console.error('[complete-user-invite] Error updating user credentials');
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar credenciais do usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createUserError || !newUser.user) {
        console.error('[complete-user-invite] Error creating user');
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário. Tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[complete-user-invite] User created:', newUser.user.id);
      userId = newUser.user.id;
    }

    // 3. Update or insert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId,
        full_name, 
        email 
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('[complete-user-invite] Error upserting profile');
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] Profile updated successfully');

    // 4. Assign or update role
    console.log('[complete-user-invite] Assigning role:', pendingUser.papel, 'to user:', userId);
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: pendingUser.papel,
      }, {
        onConflict: 'user_id,role'
      });

    if (roleError) {
      console.error('[complete-user-invite] Error assigning role');
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir papel ao usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] Role assigned successfully');

    // Verify role was actually saved
    const { data: verifyRole, error: verifyError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    console.log('[complete-user-invite] Role verification:', verifyRole ? 'Success' : 'Failed');
    if (verifyError) {
      console.error('[complete-user-invite] Error verifying role');
    }

    // 5. Mark token as used and remove from pending_users
    const { error: deleteError } = await supabase
      .from('pending_users')
      .delete()
      .eq('token', token);

    if (deleteError) {
      console.error('[complete-user-invite] Error removing token');
      return new Response(
        JSON.stringify({ error: 'Erro ao remover token de convite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-user-invite] Invitation completed successfully');
    console.log('[complete-user-invite] Summary:', {
      userId,
      email: maskEmail(email),
      role: pendingUser.papel
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conta criada com sucesso!',
        userId,
        role: pendingUser.papel
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
