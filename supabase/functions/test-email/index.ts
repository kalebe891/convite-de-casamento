import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendTransactionalEmail } from "../_shared/email/client.ts";
import { testEmailTemplate } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Campo 'to' obrigatório com email válido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const template = testEmailTemplate();

    const result = await sendTransactionalEmail({
      to: [{ email: to }],
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      return new Response(
        JSON.stringify({
          status: "sent",
          messageId: result.messageId,
          to,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "failed",
        error: result.error,
        httpStatus: result.status,
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("test-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
