/**
 * Edge SEO Renderer — Etapa 1.25.5 (fundação)
 *
 * Este Worker é apenas a base isolada do futuro Edge Renderer.
 * Nesta etapa NÃO implementa: SEO dinâmico, consulta ao Supabase,
 * proxy, cache, injeção de OG tags ou interceptação de rotas de tenant.
 *
 * Regras arquiteturais preservadas aqui:
 *  - Module Worker (export default { fetch(request, env, ctx) })
 *  - Sem addEventListener('fetch', ...) legado
 *  - Sem imports do frontend React (isolado de src/)
 *  - Origem do frontend NUNCA hardcodada — sempre via env.FRONTEND_ORIGIN
 *  - Domínio público (o que o usuário acessa) é conceitualmente distinto
 *    de FRONTEND_ORIGIN (o host que serve a SPA hoje)
 */

export interface Env {
  /**
   * Host que serve a SPA hoje (ex.: Lovable Hosting).
   * Configurado externamente via `wrangler secret` / var. Nunca hardcodar.
   * No futuro pode apontar para outro host sem reescrever a lógica.
   */
  FRONTEND_ORIGIN?: string;
}

const SERVICE_NAME = "edge-seo-renderer";
const SERVICE_VERSION = "1.25.5";

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__edge/health") {
      return Response.json(
        {
          ok: true,
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
        },
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    // Nenhuma outra rota é tratada nesta etapa. Etapas futuras
    // (1.25.6+) implementarão o proxy para env.FRONTEND_ORIGIN e a
    // injeção de metatags SEO para rotas /:eventType/:slug.
    return new Response("Edge renderer not yet active for this route.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
