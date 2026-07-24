/**
 * Etapa 1.25.9 — Handler HTTP principal do Edge Worker.
 *
 * Orquestra roteamento, consulta pública do tenant, geração do bloco SEO,
 * fetch da origem configurada e transformação streaming do HTML.
 *
 * Regras arquiteturais:
 *  - Origem NUNCA hardcodada: sempre via `env.FRONTEND_ORIGIN`.
 *  - Nunca usa o host recebido do cliente como destino do proxy.
 *  - Não encaminha headers sensíveis (Authorization, Cookie, tokens).
 *  - Somente GET dispara transformação; HEAD/POST/etc fazem pass-through.
 *  - Não usa `response.text()` — a transformação é streaming pura.
 *  - Se a origem responder não-HTML, redirect ou status ≥ 400, devolve a
 *    resposta original sem tocar.
 *  - Se qualquer etapa opcional (SEO, tenant) falhar, aplica fallback seguro.
 */
import { matchTenantRoute } from "./router/matchTenantRoute";
import { fetchTenantForSeo } from "./data/fetchTenant";
import {
  buildRenderInputFromTenant,
  renderSeoBlock,
} from "./seo/render";
import { injectSeoIntoHtmlStream } from "./http/streamInject";

export interface HandlerEnv {
  FRONTEND_ORIGIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

const SERVICE_NAME = "edge-seo-renderer";
const SERVICE_VERSION = "1.25.9";

/**
 * Headers do cliente que NUNCA devem ser encaminhados à origem interna.
 * Evita vazamento de credenciais e confusão com o proxy do host.
 */
const BLOCKED_REQUEST_HEADERS = new Set<string>([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
  "x-supabase-auth",
  "x-forwarded-authorization",
  // O host da origem é fixado pela URL construída; nunca vem do cliente.
  "host",
  // Headers específicos da borda Cloudflare que não devem ir adiante.
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
]);

function sanitizeRequestHeaders(req: Request): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) return;
    out.set(key, value);
  });
  return out;
}

function isHtmlResponse(res: Response): boolean {
  const ct = res.headers.get("content-type");
  if (!ct) return false;
  // Aceita text/html; charset=utf-8, application/xhtml+xml não é HTML SPA.
  return /^\s*text\/html\b/i.test(ct);
}

function buildOriginUrl(origin: string, url: URL): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  return cleanOrigin + url.pathname + url.search;
}

/**
 * Pass-through minimalista para métodos e rotas não elegíveis.
 * Preserva método, path e query; sanitiza headers; NÃO transforma o corpo.
 */
async function passThrough(request: Request, originUrl: string): Promise<Response> {
  const method = request.method.toUpperCase();
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: sanitizeRequestHeaders(request),
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  return fetch(originUrl, init);
}

export async function handleRequest(
  request: Request,
  env: HandlerEnv,
): Promise<Response> {
  const url = new URL(request.url);

  // Health check — jamais consulta origem ou Supabase.
  if (url.pathname === "/__edge/health") {
    return Response.json(
      { ok: true, service: SERVICE_NAME, version: SERVICE_VERSION },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const origin = env.FRONTEND_ORIGIN?.trim();
  if (!origin) {
    return new Response("Edge origin not configured", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const originUrl = buildOriginUrl(origin, url);
  const method = request.method.toUpperCase();
  const match = matchTenantRoute(url.pathname);

  // Rotas não elegíveis ou métodos que não são GET → pass-through cru.
  if (!match || method !== "GET") {
    return passThrough(request, originUrl);
  }

  // Consulta pública do tenant. Falhas silenciosas → sem SEO, mas
  // ainda entregamos o HTML da origem.
  let seoBlock: string | null = null;
  try {
    const tenantResult = await fetchTenantForSeo(
      match.eventType,
      match.slug,
      { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY },
    );
    if (tenantResult.status === "ok") {
      const input = buildRenderInputFromTenant(
        tenantResult.tenant,
        tenantResult.mainPhoto,
      );
      seoBlock = renderSeoBlock(input);
    }
  } catch {
    seoBlock = null;
  }

  let originResp: Response;
  try {
    originResp = await fetch(originUrl, {
      method: "GET",
      headers: sanitizeRequestHeaders(request),
      redirect: "manual",
    });
  } catch {
    return new Response("Upstream fetch failed", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Não transformar em caso de: sem SEO, sem body, non-HTML, redirect,
  // ou status ≥ 400. Passamos a resposta adiante sem alterar.
  if (!seoBlock) return originResp;
  if (!originResp.body) return originResp;
  if (!isHtmlResponse(originResp)) return originResp;
  if (originResp.status < 200 || originResp.status >= 300) return originResp;

  const transformed = injectSeoIntoHtmlStream(originResp.body, seoBlock);

  // Content-Length/Encoding do body original deixam de ser válidos após a
  // transformação (o Worker entrega bytes descomprimidos). O runtime
  // Cloudflare cuida da compressão final na saída conforme Accept-Encoding.
  const headers = new Headers(originResp.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  // Content-Type se mantém — continua HTML.

  return new Response(transformed, {
    status: originResp.status,
    statusText: originResp.statusText,
    headers,
  });
}
