import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../_shared/email/client.ts";
import { rsvpInviteTemplate } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '***@' + domain;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);

    if (authError || !user) {
      throw new Error("Não autorizado");
    }

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

    const { data: weddingData } = await supabase
      .from("wedding_details")
      .select("id")
      .single();

    if (!weddingData) {
      throw new Error("Detalhes do casamento não encontrados");
    }

    // Check or create invitation
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
      const uniqueCode = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
      
      const { data: newInvitation, error: invitationError } = await supabase
        .from("invitations")
        .insert({
          wedding_id: weddingData.id,
          guest_id: guest.id,
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

    // Send email via MailerSend
    const template = rsvpInviteTemplate({
      guestName: guest.name,
      invitationLink,
    });

    const emailResult = await sendTransactionalEmail({
      to: [{ email: guest.email, name: guest.name }],
      subject: template.subject,
      html: template.html,
    });

    console.log(JSON.stringify({
      event: "MAILERSEND_RESPONSE",
      function: "send-rsvp-email",
      recipient: maskEmail(guest.email),
      success: emailResult.success,
      messageId: emailResult.messageId,
      status: emailResult.status,
      error: emailResult.error || null,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_code: invitation.unique_code,
        link: invitationLink,
        email_sent: emailResult.success,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-rsvp-email function:", error);
    
    let safeErrorMessage = 'Erro ao enviar convite';
    if (error.message === 'Não autorizado') safeErrorMessage = 'Não autorizado';
    else if (error.message === 'Permissão negada') safeErrorMessage = 'Permissão negada';
    else if (error.message === 'Convidado não encontrado') safeErrorMessage = 'Convidado não encontrado';
    else if (error.message === 'Convidado não possui e-mail cadastrado') safeErrorMessage = 'Convidado não possui e-mail cadastrado';
    else if (error.message === 'Detalhes do casamento não encontrados') safeErrorMessage = 'Detalhes do casamento não encontrados';
    else if (error.message === 'Erro ao gerar convite') safeErrorMessage = 'Erro ao gerar convite';
    else if (error.message === 'MAILERSEND_API_TOKEN not configured') safeErrorMessage = 'Serviço de email não configurado';
    
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
