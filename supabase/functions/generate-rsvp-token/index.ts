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

    console.log("Token generated successfully:", { guest_id, token: tokenString });

    return new Response(
      JSON.stringify({ 
        token: tokenString,
        link: rsvpLink 
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
