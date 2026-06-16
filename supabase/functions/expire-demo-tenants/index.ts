// Edge Function: expire-demo-tenants
// Etapa 1.22.00 — expiração automática de demonstrações de 7 dias.
//
// Comportamento:
// - Busca tenants com is_demo=true, tenant_status='active', demo_expires_at <= now().
// - Marca como tenant_status='archived' e archived_at=now().
// - Registra log administrativo `DEMO_EXPIRED` por tenant arquivado.
// - Nenhuma exclusão física. Todos os dados (convidados, RSVPs, presentes,
//   cronograma, fotos, buffet, playlists, logs, user_weddings) permanecem
//   íntegros para futura conversão em licença.
//
// Autenticação:
// - Utiliza SUPABASE_SERVICE_ROLE_KEY. Não depende de sessão de usuário.
// - Projetada para execução por scheduler/cron (não acionado nesta etapa).
//
// Acionadores possíveis (não habilitados):
//   * Supabase Scheduled Functions (pg_cron + net.http_post)
//   * GitHub Actions (workflow agendado disparando o endpoint)
//   * Cron externo do provedor (ex.: cron-job.org / Vercel Cron)

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse(
      { success: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    );
  }

  // Cliente administrativo — ignora RLS, indispensável para execução
  // por scheduler sem usuário autenticado.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();

  // 1. Buscar demos elegíveis
  const { data: eligible, error: selErr } = await admin
    .from("wedding_details")
    .select("id, slug, demo_expires_at")
    .eq("is_demo", true)
    .eq("tenant_status", "active")
    .lte("demo_expires_at", nowIso);

  if (selErr) {
    return jsonResponse({ success: false, error: selErr.message }, 500);
  }

  const targets = eligible ?? [];
  if (targets.length === 0) {
    return jsonResponse({ success: true, expired: 0, tenants: [] });
  }

  const ids = targets.map((t) => t.id);

  // 2. Arquivar em lote (nenhuma exclusão física).
  const { error: updErr } = await admin
    .from("wedding_details")
    .update({
      tenant_status: "archived",
      archived_at: nowIso,
    })
    .in("id", ids);

  if (updErr) {
    return jsonResponse({ success: false, error: updErr.message }, 500);
  }

  // 3. Registrar logs administrativos (DEMO_EXPIRED).
  const logs = targets.map((t) => ({
    user_id: null,
    user_email: "system@expire-demo-tenants",
    action: "DEMO_EXPIRED",
    table_name: "wedding_details",
    record_id: t.id,
    affected_name: t.slug,
    old_data: { tenant_status: "active" },
    new_data: {
      tenant_status: "archived",
      archived_at: nowIso,
      demo_expires_at: t.demo_expires_at,
    },
    wedding_id: t.id,
  }));

  const { error: logErr } = await admin.from("admin_logs").insert(logs);

  return jsonResponse({
    success: true,
    expired: targets.length,
    tenants: targets.map((t) => ({ id: t.id, slug: t.slug })),
    log_error: logErr?.message ?? null,
  });
});
