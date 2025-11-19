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

interface InviteRequest {
  email: string;
  nome?: string;
  role: 'admin' | 'couple' | 'planner';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin role
    const { data: hasAdminRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (!hasAdminRole) {
      throw new Error("User is not an admin");
    }

    const { email, nome, role }: InviteRequest = await req.json();
    console.log(`Creating invitation for: ${email} with role: ${role}`);

    // Create or update pending user (email is now the PK)
    const { data: pendingUser, error: pendingError } = await supabase
      .from('pending_users')
      .upsert({
        email,
        nome: nome || email.split('@')[0],
        papel: role,
        usado: false,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (pendingError) {
      console.error('Error creating pending user:', pendingError);
      throw pendingError;
    }

    console.log('Pending user created:', pendingUser.id);

    // Generate invitation link
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
    const invitationLink = `${origin}/criar-senha?t=${pendingUser.token}`;

    // Try to send email via Resend
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
        console.log('Email sent via Resend');
      } else {
        console.error('Resend error:', (mailResp as any).error);
      }
    } catch (emailErr) {
      console.error('Error sending email (non-blocking):', emailErr);
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
    console.error("Error in invite-admin function:", error);
    
    // Return safe error message to client, log full error for debugging
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
