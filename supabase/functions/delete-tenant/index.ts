// Edge Function: delete-tenant
// Etapa 16B — exclusão real ativada.
// Regras:
// - dry_run obrigatório no payload (true|false).
// - Em dry_run=true: apenas audita impacto (16A).
// - Em dry_run=false: limpa Storage (com paginação + chunks) e executa
//   DELETE EXCLUSIVAMENTE em wedding_details por id. Demais tabelas dependem
//   de ON DELETE CASCADE / SET NULL configurados no PostgreSQL.
// - Nunca deletar tabelas filhas manualmente.
// - Erros de FK (PostgreSQL 23503) viram REFERENTIAL_INTEGRITY_ERROR.

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

const STORAGE_BUCKET = "wedding-photos";
const STORAGE_CHUNK_SIZE = 100;
const PHOTOS_PAGE_SIZE = 1000;

/**
 * Converte uma photo_url (pública ou path interno) em path interno do bucket.
 * Retorna null se não conseguir derivar com segurança.
 */
function extractStoragePath(photoUrl: string, bucket: string): string | null {
  if (!photoUrl || typeof photoUrl !== "string") return null;
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;

  // URL pública padrão: .../storage/v1/object/public/<bucket>/<path>
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const idx = trimmed.indexOf(publicMarker);
  if (idx >= 0) {
    const path = trimmed.substring(idx + publicMarker.length).split("?")[0];
    return sanitizePath(path);
  }

  // Caso já seja um path relativo (sem http)
  if (!/^https?:\/\//i.test(trimmed)) {
    // remove prefixo de bucket eventual
    const stripped = trimmed.replace(new RegExp(`^/?${bucket}/`), "");
    return sanitizePath(stripped);
  }

  return null;
}

function sanitizePath(path: string): string | null {
  if (!path) return null;
  const clean = path.replace(/^\/+/, "").trim();
  if (!clean) return null;
  if (clean === "/" || clean === ".") return null;
  // bloquear traversal
  if (clean.includes("..")) return null;
  return clean;
}

function isNotFoundError(err: { message?: string; statusCode?: string | number } | null) {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  const code = String(err.statusCode ?? "");
  return (
    msg.includes("not found") ||
    msg.includes("object not found") ||
    msg.includes("does not exist") ||
    code === "404"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Método não permitido", 405, "METHOD_NOT_ALLOWED");
  }

  try {
    // ---- body ----
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
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
      typeof dry_run !== "boolean" // 16B: dry_run agora é OBRIGATÓRIO
    ) {
      return errorResponse("Payload inválido", 400, "BAD_REQUEST");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ---- auth ----
    // 1. Capturar o header enviado pelo front-end
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Header Authorization ausente na requisição", 401, "UNAUTHENTICATED");
    }

    // 2. Instanciar cliente APENAS para validação do usuário
    const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Validar a sessão real
    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();

    if (authError || !user) {
      console.error("Erro interno do getUser:", authError);
      return errorResponse("Sessão inválida ou expirada", 401, "UNAUTHENTICATED");
    }
    const userId = user.id;

    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ---- role check ----
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

    // ---- master pin ----
    const masterPin = Deno.env.get("MASTER_DELETE_PIN");
    if (!masterPin || masterPin.trim().length === 0) {
      return errorResponse(
        "PIN mestre de exclusão não configurado.",
        500,
        "MISSING_MASTER_DELETE_PIN"
      );
    }
    if (password_confirm !== masterPin) {
      return errorResponse("PIN de segurança incorreto", 401, "INVALID_PIN");
    }

    // ---- tenant lookup ----
    const { data: tenant, error: tenantError } = await serviceClient
      .from("wedding_details")
      .select(
        "id, slug, event_type, bride_name, groom_name, wedding_date, created_at"
      )
      .eq("id", wedding_id)
      .maybeSingle();
    if (tenantError) {
      return errorResponse("Erro ao buscar evento", 500, "TENANT_LOOKUP_FAILED");
    }
    if (!tenant) {
      return errorResponse("Evento não encontrado", 404, "TENANT_NOT_FOUND");
    }

    // ---- impact audit (sempre) ----
    const impact: Record<string, number | string> = {};
    for (const table of COUNT_TABLES) {
      try {
        const { count, error } = await serviceClient
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", wedding_id);
        impact[table] = error ? `error: ${error.code ?? "unknown"}` : count ?? 0;
      } catch {
        impact[table] = "error";
      }
    }

    // ---- coleta de paths do Storage (paginada) ----
    const storagePaths: string[] = [];
    let photos_pages_processed = 0;
    {
      let from = 0;
      while (true) {
        const { data, error } = await serviceClient
          .from("photos")
          .select("photo_url")
          .eq("wedding_id", wedding_id)
          .range(from, from + PHOTOS_PAGE_SIZE - 1);
        if (error) {
          return errorResponse(
            "Falha ao coletar arquivos do Storage.",
            500,
            "STORAGE_COLLECT_FAILED"
          );
        }
        if (!data || data.length === 0) break;
        photos_pages_processed += 1;
        for (const row of data) {
          const path = extractStoragePath(
            (row as { photo_url?: string }).photo_url ?? "",
            STORAGE_BUCKET
          );
          if (path) storagePaths.push(path);
        }
        if (data.length < PHOTOS_PAGE_SIZE) break;
        from += PHOTOS_PAGE_SIZE;
      }
    }

    // ---- DRY RUN ----
    if (dry_run === true) {
      return successResponse({
        dry_run: true,
        wedding_id,
        tenant_found: true,
        tenant,
        impact: {
          ...impact,
          storage_paths_detected: storagePaths.length,
          photos_pages_processed,
        },
        notes: [
          "dry_run=true: nenhuma exclusão executada.",
          "Storage não removido. wedding_details não removido.",
        ],
      });
    }

    // ============================================================
    // EXCLUSÃO REAL (dry_run === false)
    // ============================================================

    // ---- Storage: remover em chunks sequenciais ----
    let files_removed = 0;
    let files_not_found = 0;
    let chunks_processed = 0;
    const uniquePaths = Array.from(new Set(storagePaths)).filter(Boolean);

    for (let i = 0; i < uniquePaths.length; i += STORAGE_CHUNK_SIZE) {
      const chunk = uniquePaths.slice(i, i + STORAGE_CHUNK_SIZE);
      if (chunk.length === 0) continue;
      const { data, error } = await serviceClient.storage
        .from(STORAGE_BUCKET)
        .remove(chunk);

      if (error) {
        if (isNotFoundError(error)) {
          files_not_found += chunk.length;
          chunks_processed += 1;
          continue;
        }
        return errorResponse(
          "Falha ao remover arquivos do Storage. O evento não foi excluído.",
          500,
          "STORAGE_DELETE_FAILED"
        );
      }

      chunks_processed += 1;
      // data é lista dos arquivos removidos com sucesso (pode incluir "not found" sem erro)
      const removedNow = Array.isArray(data) ? data.length : chunk.length;
      files_removed += removedNow;
      if (removedNow < chunk.length) {
        files_not_found += chunk.length - removedNow;
      }
    }

    // ---- DELETE final exclusivamente em wedding_details ----
    const { error: deleteError } = await serviceClient
      .from("wedding_details")
      .delete()
      .eq("id", wedding_id);

    if (deleteError) {
      if ((deleteError as { code?: string }).code === "23503") {
        return errorResponse(
          "Erro de integridade referencial. Verifique as constraints de Cascade no banco de dados.",
          500,
          "REFERENTIAL_INTEGRITY_ERROR"
        );
      }
      return errorResponse(
        "Não foi possível excluir o evento.",
        500,
        "TENANT_DELETE_FAILED"
      );
    }

    return successResponse({
      dry_run: false,
      wedding_id,
      tenant_deleted: true,
      storage: {
        bucket: STORAGE_BUCKET,
        total_paths_collected: uniquePaths.length,
        chunks_processed,
        files_removed,
        files_not_found,
      },
      impact,
    });
  } catch {
    return errorResponse(
      "Erro inesperado ao excluir evento",
      500,
      "INTERNAL_ERROR"
    );
  }
});
