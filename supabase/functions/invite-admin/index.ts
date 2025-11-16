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

    // Create user directly using admin API (without triggering hooks)
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        role: role,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    if (!userData.user) {
      throw new Error("User creation failed - no user data returned");
    }

    console.log("User created successfully:", userData.user.id);

    // Create profile manually
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        email: email,
        full_name: null,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue anyway - profile might already exist
    }

    // Assign role manually
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      throw roleError;
    }

    console.log("Role assigned successfully");

    // Generate a password reset link for the user to set their password
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

    // Send custom invitation email with Resend
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: userData }),
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
