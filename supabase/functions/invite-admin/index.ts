import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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

    const { email, role }: InviteRequest = await req.json();

    console.log(`Inviting user: ${email} with role: ${role}`);

    // Prefer official invite: creates the user (if needed) and sends email
    let targetUserId: string | null = null;

    try {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get("origin")}/auth`,
      });

      if (!inviteError && inviteData?.user?.id) {
        targetUserId = inviteData.user.id;
        console.log("Backend invite sent successfully:", targetUserId);

        // Ensure profile and role (idempotent)
        const { error: upsertProfileError } = await supabase
          .from('profiles')
          .upsert(
            { id: targetUserId, email },
            { onConflict: 'id', ignoreDuplicates: false }
          );
        if (upsertProfileError) {
          console.error('Error upserting profile:', upsertProfileError);
        }

        const { error: upsertRoleError } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: targetUserId, role },
            { onConflict: 'user_id,role' }
          );
        if (upsertRoleError) {
          console.error("Error assigning role:", upsertRoleError);
        }

        return new Response(
          JSON.stringify({ success: true, user_id: targetUserId, email, method: "backend_invite" }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // If the user already exists, continue with magic link flow below
      if (inviteError) {
        const code = (inviteError as any)?.code || (inviteError as any)?.error?.code;
        const status = (inviteError as any)?.status || (inviteError as any)?.error?.status;
        if (code === 'email_exists' || status === 422) {
          console.log("User already exists, proceeding with reinvite flow");
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) {
            console.error('Error listing users:', listError);
            throw new Error('Failed to find existing user');
          }
          const existingUser = users.find(u => u.email === email);
          if (existingUser) {
            targetUserId = existingUser.id;
            console.log("Found existing user:", targetUserId);
          } else {
            throw new Error('User exists but could not be found');
          }

          // Ensure profile and role (idempotent)
          const { error: upsertProfileError } = await supabase
            .from('profiles')
            .upsert(
              { id: targetUserId, email },
              { onConflict: 'id', ignoreDuplicates: false }
            );
          if (upsertProfileError) console.error('Error upserting profile:', upsertProfileError);

          const { error: upsertRoleError } = await supabase
            .from('user_roles')
            .upsert(
              { user_id: targetUserId, role },
              { onConflict: 'user_id,role' }
            );
          if (upsertRoleError) console.error("Error assigning role:", upsertRoleError);
        } else {
          throw inviteError;
        }
      }
    } catch (inviteUnexpectedErr) {
      console.error("Unexpected error in inviteUserByEmail:", inviteUnexpectedErr);
      // Will fallback to magic link + Resend below
    }

    // Generate a magic link for the user to access and set password if needed
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin")}/auth`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }

    // Send custom invitation email with Resend (do not fail if Resend key is invalid)
    try {
      const emailResponse = await resend.emails.send({
        from: "Convite de Casamento <onboarding@resend.dev>",
        to: [email],
        subject: "Convite para administrar o site de casamento",
        html: `
          <h1>Você foi convidado!</h1>
          <p>Você foi convidado para ser <strong>${role === 'admin' ? 'administrador' : role === 'couple' ? 'do casal' : 'cerimonialista'}</strong> do site de casamento.</p>
          <p>Clique no link abaixo para definir sua senha e acessar o painel administrativo:</p>
          <p><a href="${resetData.properties.action_link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Definir Senha e Acessar</a></p>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetData.properties.action_link}</p>
          <br>
          <p>Atenciosamente,</p>
          <p><strong>Equipe do Casamento</strong></p>
        `,
      });
      console.log("Email send attempt response:", emailResponse);
    } catch (emailErr) {
      console.error('Resend email error (non-blocking):', emailErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: targetUserId, 
        email,
        magic_link: resetData.properties.action_link 
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
