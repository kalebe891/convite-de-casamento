import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Security helpers
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
    
    // Verify the requesting user is an admin
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

    // Check if user has admin role
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
      console.log(`[invite-admin] Starting invitation process for:`, maskEmail(email), 'with role:', role);
    }

    // Delete any existing pending invite for this email to generate a new token
    if (isDev) {
      console.log(`[invite-admin] Deleting existing pending invites for:`, maskEmail(email));
    }
    const { error: deleteError } = await supabase
      .from('pending_users')
      .delete()
      .eq('email', email);
    
    if (deleteError) {
      console.error('[invite-admin] Error deleting existing invites:', deleteError);
    }

    // Validate role exists in role_profiles
    if (isDev) {
      console.log(`[invite-admin] Validating role '${role}' exists in role_profiles`);
    }
    const { data: roleExists, error: roleValidationError } = await supabase
      .from('role_profiles')
      .select('role_key')
      .eq('role_key', role)
      .single();
    
    if (roleValidationError || !roleExists) {
      console.error(`[invite-admin] Invalid role provided:`, role);
      throw new Error(`Papel inválido: ${role}. O papel não existe no sistema.`);
    }
    
    if (isDev) {
      console.log(`[invite-admin] Role '${role}' validated successfully`);
    }

    // Create new pending user with fresh token
    if (isDev) {
      console.log(`[invite-admin] Creating pending user record`);
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
      console.log(`[invite-admin] Pending user created successfully with token:`, maskToken(pendingUser.token));
    }

    // Generate invitation link
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
    const invitationLink = `${origin}/criar-senha?t=${pendingUser.token}`;

    // Try to send email via Resend
    if (isDev) {
      console.log(`[invite-admin] Attempting to send email to:`, maskEmail(email));
    }
    let emailSent = false;
    try {
      const mailResp = await resend.emails.send({
        from: 'Convite Casamento <onboarding@resend.dev>',
        to: [email],
        subject: 'Convite para Painel Administrativo - Beatriz & Diogo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Você foi convidado!</h2>
            <p>Olá, ${nome || 'usuário'}!</p>
            <p>Você foi convidado para acessar o painel administrativo do casamento.</p>
            <p>Seu papel: <strong>${role === 'admin' ? 'Administrador' : role === 'couple' ? 'Casal' : 'Cerimonialista'}</strong></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Criar Senha e Acessar
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Ou copie o link abaixo:</p>
            <p style="word-break: break-all; color: #4F46E5; font-size: 12px;">${invitationLink}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Este link expira em 48 horas.</p>
          </div>
        `,
      });
      if (!(mailResp as any)?.error) {
        emailSent = true;
        if (isDev) {
          console.log(`[invite-admin] Email sent successfully via Resend to:`, maskEmail(email));
        }
      } else {
        console.error('[invite-admin] Resend API returned error');
      }
    } catch (emailErr) {
      console.error('[invite-admin] Error sending email (non-blocking):', emailErr);
    }

    if (isDev) {
      console.log(`[invite-admin] Successfully created invitation for:`, maskEmail(email));
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        email, 
        invitation_link: invitationLink,
        email_sent: emailSent,
        expires_in_hours: 48,
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
    console.error("[invite-admin] Critical error in function");
    
    // Return safe error message to client
    const safeErrorMessage = error.message?.toLowerCase().includes('unauthorized') || error.message?.toLowerCase().includes('admin')
      ? 'Você não tem permissão para esta operação.'
      : error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique')
      ? 'Este usuário já foi convidado.'
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
