// Edge Function: delete-tenant
// Etapa 16A — DRY-RUN obrigatório.
// Esta função NÃO deleta wedding_details nem arquivos do Storage.
// Apenas valida JWT, role global admin, Master PIN e audita impacto.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500, code?: string) {
  return jsonResponse({ success: false, error: message, code }, status);
}

function successResponse(body: Record<string, unknown> = {}) {
  return jsonResponse({ success: true, ...body }, 200);
}

// Tables that have a wedding_id column and support simple count(exact) audit.
const COUNT_TABLES = [
  "user_weddings",
  "guests",
  "invitations",
  "rsvps",
  "rsvp_tokens",
  "gift_items",
  "photos",
  "events",
  "timeline_events",
  "buffet_items",
  "playlist_songs",
  "admin_logs",
  "checkin_logs",
  "pending_users",
] as const;

Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Method
  if (req.method !== "POST") {
    return errorResponse("Método não permitido", 405, "METHOD_NOT_ALLOWED");
  }

  try {
    // 3. Body — safe read
    let payload: unknown;
    try {
      payload = await req.json();
    } catch (_e) {
      return errorResponse("Payload inválido", 400, "BAD_JSON");
    }
    if (!payload || typeof payload !== "object") {
      return errorResponse("Payload inválido", 400, "BAD_REQUEST");
    }
    const { wedding_id, password_confirm, dry_run } = payload as Record<
      string,
      unknown
    >;
    if (
      typeof wedding_id !== "string" ||
      wedding_id.trim().length === 0 ||
      typeof password_confirm !== "string" ||
      password_confirm.length === 0 ||
      (dry_run !== undefined && typeof dry_run !== "boolean")
    ) {
      return errorResponse("Payload inválido", 400, "BAD_REQUEST");
    }

    // 4. Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Usuário não autenticado", 401, "UNAUTHENTICATED");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 5. User-scoped client to validate JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return errorResponse("Usuário não autenticado", 401, "UNAUTHENTICATED");
    }
    const userId = claimsData.claims.sub as string;

    // 6. Service-role client (for role check + audit, bypassing RLS safely)
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 7. Validate global admin role
    const { data: roleRows, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);
    if (roleError) {
      return errorResponse(
        "Erro ao validar permissões",
        500,
        "ROLE_CHECK_FAILED"
      );
    }
    if (!roleRows || roleRows.length === 0) {
      return errorResponse(
        "Você não tem permissão para excluir eventos",
        403,
        "FORBIDDEN"
      );
    }

    // 8. Validate Master PIN (env secret, with dev fallback)
    const masterPin = Deno.env.get("MASTER_DELETE_PIN") || "admin123";
    if (password_confirm !== masterPin) {
      return errorResponse(
        "PIN de segurança incorreto",
        401,
        "INVALID_PIN"
      );
    }

    // 9. Find tenant
    const { data: tenant, error: tenantError } = await serviceClient
      .from("wedding_details")
      .select(
        "id, slug, event_type, bride_name, groom_name, wedding_date, created_at"
      )
      .eq("id", wedding_id)
      .maybeSingle();
    if (tenantError) {
      return errorResponse(
        "Erro ao buscar evento",
        500,
        "TENANT_LOOKUP_FAILED"
      );
    }
    if (!tenant) {
      return errorResponse("Evento não encontrado", 404, "TENANT_NOT_FOUND");
    }

    // 10. Audit impact — count(exact) + head:true (no rows transferred)
    const impact: Record<string, number | string> = {};
    for (const table of COUNT_TABLES) {
      try {
        const { count, error } = await serviceClient
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", wedding_id);
        if (error) {
          impact[table] = `error: ${error.code ?? "unknown"}`;
        } else {
          impact[table] = count ?? 0;
        }
      } catch {
        impact[table] = "error";
      }
    }

    // 11. Photos pagination rehearsal (collect photo_url, no removal)
    let storage_paths_detected = 0;
    let photos_pages_processed = 0;
    try {
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await serviceClient
          .from("photos")
          .select("photo_url")
          .eq("wedding_id", wedding_id)
          .range(from, from + pageSize - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        photos_pages_processed += 1;
        storage_paths_detected += data.filter(
          (p) => typeof p.photo_url === "string" && p.photo_url.length > 0
        ).length;
        if (data.length < pageSize) break;
        from += pageSize;
      }
    } catch {
      // non-fatal during dry-run
    }

    // 12. DRY-RUN — never delete in Etapa 16A
    return successResponse({
      dry_run: true,
      requested_dry_run: dry_run ?? null,
      wedding_id,
      tenant_found: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        event_type: tenant.event_type,
        bride_name: tenant.bride_name,
        groom_name: tenant.groom_name,
        wedding_date: tenant.wedding_date,
        created_at: tenant.created_at,
      },
      impact: {
        ...impact,
        storage_paths_detected,
        photos_pages_processed,
      },
      notes: [
        "Etapa 16A: validação e auditoria apenas.",
        "Nenhum registro de wedding_details foi removido.",
        "Nenhum arquivo de Storage foi removido.",
      ],
    });
  } catch (_e) {
    return errorResponse(
      "Erro inesperado ao auditar exclusão",
      500,
      "INTERNAL_ERROR"
    );
  }
});
