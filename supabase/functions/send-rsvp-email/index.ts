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

    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);

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

    // Get wedding details
    const { data: weddingData } = await supabase
      .from("wedding_details")
      .select("id")
      .single();

    if (!weddingData) {
      throw new Error("Detalhes do casamento não encontrados");
    }

    // Check if invitation already exists for this guest
    let invitation;
    const { data: existingInvitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("guest_email", guest.email)
      .eq("wedding_id", weddingData.id)
      .single();

    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      // Create new invitation with unique code
      const uniqueCode = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
      
      const { data: newInvitation, error: invitationError } = await supabase
        .from("invitations")
        .insert({
          wedding_id: weddingData.id,
          guest_name: guest.name,
          guest_email: guest.email,
          guest_phone: guest.phone,
          unique_code: uniqueCode,
        })
        .select()
        .single();

      if (invitationError) {
        console.error("Error creating invitation:", invitationError);
        throw new Error("Erro ao gerar convite");
      }

      invitation = newInvitation;
    }

    const origin = req.headers.get("origin") || "http://localhost:8080";
    const invitationLink = `${origin}/convite/${invitation.unique_code}`;

    // Get invitation message template from wedding_details
    const { data: weddingDetails } = await supabase
      .from("wedding_details")
      .select("invitation_message")
      .single();

    const fallback = `{guest_name}, confirme sua presença:\n{invitation_link}`;
    const rawTemplate = (weddingDetails as any)?.invitation_message?.trim() || fallback;
    const messageText = rawTemplate
      .replace(/\{guest_name\}/g, guest.name)
      .replace(/\{invitation_link\}/g, invitationLink);

    // Convert plain text to HTML paragraphs
    const messageHtml = messageText
      .split("\n")
      .map((line: string) => line.trim() === "" ? "<br>" : `<p style="font-size: 16px; color: #666; text-align: center; margin: 4px 0;">${line}</p>`)
      .join("");

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Convite de Casamento <onboarding@resend.dev>",
      to: [guest.email],
      subject: "Você está convidado para o nosso casamento! ❤️",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${messageHtml}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" 
               style="background-color: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">
              Confirmar Presença
            </a>
          </div>
          <p style="font-size: 14px; color: #999; text-align: center;">
            Ou copie e cole este link no seu navegador:<br>
            <span style="color: #666;">${invitationLink}</span>
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_code: invitation.unique_code,
        link: invitationLink 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-rsvp-email function:", error);
    
    // Map error messages to safe generic responses
    let safeErrorMessage = 'Erro ao enviar convite';
    if (error.message === 'Não autorizado') {
      safeErrorMessage = 'Não autorizado';
    } else if (error.message === 'Permissão negada') {
      safeErrorMessage = 'Permissão negada';
    } else if (error.message === 'Convidado não encontrado') {
      safeErrorMessage = 'Convidado não encontrado';
    } else if (error.message === 'Convidado não possui e-mail cadastrado') {
      safeErrorMessage = 'Convidado não possui e-mail cadastrado';
    } else if (error.message === 'Detalhes do casamento não encontrados') {
      safeErrorMessage = 'Detalhes do casamento não encontrados';
    } else if (error.message === 'Erro ao gerar convite') {
      safeErrorMessage = 'Erro ao gerar convite';
    }
    
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
