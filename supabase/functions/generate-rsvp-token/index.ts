import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateTokenRequest {
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

    const { guest_id }: GenerateTokenRequest = await req.json();

    // Get guest details
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("*")
      .eq("id", guest_id)
      .single();

    if (guestError || !guest) {
      throw new Error("Convidado não encontrado");
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

    console.log("Invitation generated successfully:", { guest_id, invitation_code: invitation.unique_code });

    return new Response(
      JSON.stringify({ 
        invitation_code: invitation.unique_code,
        link: invitationLink 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-rsvp-token:", error);
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
