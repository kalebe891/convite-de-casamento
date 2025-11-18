import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRSVPEmailRequest {
  guest_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Não autorizado");
    }

    // Check if user has required role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "couple", "planner"])
      .single();

    if (!roleData) {
      throw new Error("Permissão negada");
    }

    const { guest_id }: SendRSVPEmailRequest = await req.json();

    // Get guest details
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("*")
      .eq("id", guest_id)
      .single();

    if (guestError || !guest) {
      throw new Error("Convidado não encontrado");
    }

    if (!guest.email) {
      throw new Error("Convidado não possui e-mail cadastrado");
    }

    // Generate token
    const tokenString = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: tokenData, error: tokenError } = await supabase
      .from("rsvp_tokens")
      .insert({
        token: tokenString,
        guest_id: guest_id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (tokenError) {
      console.error("Error creating token:", tokenError);
      throw new Error("Erro ao gerar token");
    }

    const origin = req.headers.get("origin") || "http://localhost:8080";
    const rsvpLink = `${origin}/rsvp?token=${tokenString}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Convite de Casamento <onboarding@resend.dev>",
      to: [guest.email],
      subject: "Você está convidado para o nosso casamento! ❤️",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Você está convidado!</h1>
          <p style="font-size: 16px; color: #666; text-align: center;">
            Olá, ${guest.name}! ❤️
          </p>
          <p style="font-size: 16px; color: #666; text-align: center;">
            Estamos muito felizes em convidá-lo(a) para celebrar conosco este momento tão especial!
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${rsvpLink}" 
               style="background-color: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">
              Confirmar Presença
            </a>
          </div>
          <p style="font-size: 14px; color: #999; text-align: center;">
            Ou copie e cole este link no seu navegador:<br>
            <span style="color: #666;">${rsvpLink}</span>
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        token: tokenString,
        link: rsvpLink 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-rsvp-email function:", error);
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
