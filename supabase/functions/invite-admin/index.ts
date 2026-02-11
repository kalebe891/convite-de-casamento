import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../_shared/email/client.ts";
import { inviteAdminTemplate } from "../_shared/email/templates.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '***@' + domain;
};
const maskToken = (token: string): string => token ? token.slice(0, 8) + '...(hidden)' : 'N/A';

interface InviteRequest {
  email: string;
  nome?: string;
  role: 'admin' | 'couple' | 'planner';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isDev = Deno.env.get("ENVIRONMENT") !== "production";

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[invite-admin] No authorization header provided');
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[invite-admin] User authentication failed');
      throw new Error("Unauthorized");
    }

    if (isDev) {
      console.log(`[invite-admin] User authenticated:`, maskEmail(user.email || 'unknown'));
    }

    const { data: hasAdminRole, error: roleCheckError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (roleCheckError) {
      console.error('[invite-admin] Error checking admin role:', roleCheckError);
      throw new Error("Error verifying permissions");
    }
    
    if (!hasAdminRole) {
      console.error(`[invite-admin] User lacks admin permissions`);
      throw new Error("User is not an admin");
    }

    const { email, nome, role }: InviteRequest = await req.json();
    
    if (isDev) {
      console.log(`[invite-admin] Starting invitation for:`, maskEmail(email), 'role:', role);
    }

    const { error: deleteError } = await supabase
      .from('pending_users')
      .delete()
      .eq('email', email);
    
    if (deleteError) {
      console.error('[invite-admin] Error deleting existing invites:', deleteError);
    }

    const { data: roleData, error: roleValidationError } = await supabase
      .from('role_profiles')
      .select('role_key, role_label')
      .eq('role_key', role)
      .single();
    
    if (roleValidationError || !roleData) {
      console.error(`[invite-admin] Invalid role:`, role);
      throw new Error(`Papel inválido: ${role}. O papel não existe no sistema.`);
    }

    const { data: pendingUser, error: pendingError } = await supabase
      .from('pending_users')
      .insert({
        email,
        nome: nome || email.split('@')[0],
        papel: role,
        usado: false,
      })
      .select()
      .single();

    if (pendingError) {
      console.error('[invite-admin] Error creating pending user');
      throw pendingError;
    }

    if (isDev) {
      console.log(`[invite-admin] Pending user created, token:`, maskToken(pendingUser.token));
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
    const invitationLink = `${origin}/criar-senha?t=${pendingUser.token}`;

    // Send email via MailerSend
    const template = inviteAdminTemplate({
      nome: nome || 'usuário',
      roleLabel: roleData.role_label,
      invitationLink,
    });

    const emailResult = await sendTransactionalEmail({
      to: [{ email, name: nome || email.split('@')[0] }],
      subject: template.subject,
      html: template.html,
    });

    console.log(JSON.stringify({
      event: "MAILERSEND_RESPONSE",
      function: "invite-admin",
      recipient: maskEmail(email),
      success: emailResult.success,
      messageId: emailResult.messageId,
      status: emailResult.status,
      error: emailResult.error || null,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        email, 
        invitation_link: invitationLink,
        email_sent: emailResult.success,
        expires_in_hours: 48,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[invite-admin] Critical error in function");
    
    const safeErrorMessage = error.message?.toLowerCase().includes('unauthorized') || error.message?.toLowerCase().includes('admin')
      ? 'Você não tem permissão para esta operação.'
      : error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique')
      ? 'Este usuário já foi convidado.'
      : error.message === 'MAILERSEND_API_TOKEN not configured'
      ? 'Serviço de email não configurado.'
      : 'Erro ao processar convite. Tente novamente.';
    
    return new Response(
      JSON.stringify({ error: safeErrorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
