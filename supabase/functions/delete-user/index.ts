import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with user's token to verify they're authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Error checking role:', roleError);
      throw new Error('Error checking permissions');
    }

    if (!hasAdminRole) {
      throw new Error('Only admins can delete users');
    }

    // Parse request body
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Prevent self-deletion
    if (userId === user.id) {
      throw new Error('You cannot delete your own account');
    }

    console.log('Deleting user:', userId);

    // Clean up dependent records before deleting auth user
    // 1. Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesError) {
      console.error('Error deleting user_roles:', rolesError);
    }

    // 2. Delete admin_logs referencing user
    const { error: logsError } = await supabaseAdmin
      .from('admin_logs')
      .delete()
      .eq('user_id', userId);
    if (logsError) {
      console.error('Error deleting admin_logs:', logsError);
    }

    // 3. Delete checkin_logs performed by user
    const { error: checkinLogsError } = await supabaseAdmin
      .from('checkin_logs')
      .delete()
      .eq('performed_by', userId);
    if (checkinLogsError) {
      console.error('Error deleting checkin_logs:', checkinLogsError);
    }

    // 4. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    // Now delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    
    // Map error messages to safe generic responses
    let safeErrorMessage = 'Erro ao excluir usuário';
    if (error.message === 'Missing authorization header') {
      safeErrorMessage = 'Não autorizado';
    } else if (error.message === 'Unauthorized') {
      safeErrorMessage = 'Não autorizado';
    } else if (error.message === 'Only admins can delete users') {
      safeErrorMessage = 'Apenas administradores podem excluir usuários';
    } else if (error.message === 'User ID is required') {
      safeErrorMessage = 'ID do usuário é obrigatório';
    } else if (error.message === 'You cannot delete your own account') {
      safeErrorMessage = 'Você não pode excluir sua própria conta';
    }
    
    return new Response(
      JSON.stringify({ error: safeErrorMessage }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
