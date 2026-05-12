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
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    // Create client with user's token for auth verification
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user's token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      throw new Error("Não autorizado");
    }

    // Create service role client for privileged operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    if (!guest_id || typeof guest_id !== "string") {
      throw new Error("guest_id obrigatório");
    }

    // Get guest details (includes wedding_id — source of truth)
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("id, name, email, phone, wedding_id")
      .eq("id", guest_id)
      .maybeSingle();

    if (guestError || !guest) {
      throw new Error("Convidado não encontrado");
    }

    if (!guest.wedding_id) {
      throw new Error("Convidado sem casamento vinculado");
    }

    // Multi-tenant access validation
    const { data: hasAccess, error: accessErr } = await supabase.rpc(
      "user_has_wedding_access",
      { _user_id: user.id, _wedding_id: guest.wedding_id }
    );
    if (accessErr || !hasAccess) {
      throw new Error("Permissão negada");
    }

    // Check if active invitation already exists for this guest
    let invitation;
    const { data: existingInvitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("guest_id", guest.id)
      .eq("wedding_id", guest.wedding_id)
      .maybeSingle();

    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      const uniqueCode = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();

      const { data: newInvitation, error: invitationError } = await supabase
        .from("invitations")
        .insert({
          wedding_id: guest.wedding_id,
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

    console.log("Invitation generated successfully for guest:", guest_id);

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
    
    // Map error messages to safe generic responses
    let safeErrorMessage = 'Erro ao gerar convite';
    if (error.message === 'Não autorizado') {
      safeErrorMessage = 'Não autorizado';
    } else if (error.message === 'Permissão negada') {
      safeErrorMessage = 'Permissão negada';
    } else if (error.message === 'Convidado não encontrado') {
      safeErrorMessage = 'Convidado não encontrado';
    } else if (error.message === 'Detalhes do casamento não encontrados') {
      safeErrorMessage = 'Detalhes do casamento não encontrados';
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
