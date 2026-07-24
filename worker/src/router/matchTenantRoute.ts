/**
 * Etapa 1.25.9 — Roteador puro do Edge Worker.
 *
 * Decide se uma rota HTTP é elegível para injeção SEO por tenant.
 * Sem dependências de React/DOM/Cloudflare. Reutiliza integralmente
 * as regras isomórficas de eventType e slug reservado.
 */
import {
  isValidRouteEventType,
  isReservedSlug,
  type UrlEventType,
} from "../../../src/lib/seo/eventType";

/** Segundo segmento aceito: mesmo padrão validado em fetchTenant. */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,127})$/;

/** Palavras que NUNCA são slug de tenant, ainda que não estejam em RESERVED_SLUGS. */
const NON_TENANT_SEGMENTS = new Set<string>([
  "convite",
  "convites",
  "rsvp",
  "admin",
  "auth",
]);

export interface TenantRouteMatch {
  eventType: UrlEventType;
  slug: string;
}

/**
 * Retorna a rota de tenant `/:eventType/:slug` quando — e somente quando —
 * a URL representa exatamente uma landing pública de tenant elegível a SEO.
 *
 * Rejeita, entre outras: `/`, `/casamento`, `/casamento/convite`,
 * `/casamento/:slug/admin`, `/casamento/:slug/rsvp`, assets, admin,
 * e qualquer variação com mais de 2 segmentos.
 */
export function matchTenantRoute(pathname: string): TenantRouteMatch | null {
  if (typeof pathname !== "string") return null;
  // Rejeita imediatamente extensões de arquivo (assets estáticos).
  if (/\.[a-zA-Z0-9]{1,8}$/.test(pathname)) return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const [rawType, rawSlug] = parts;
  if (!isValidRouteEventType(rawType)) return null;

  const slug = rawSlug.toLowerCase();
  if (NON_TENANT_SEGMENTS.has(slug)) return null;
  if (isReservedSlug(slug)) return null;
  if (!SLUG_REGEX.test(slug)) return null;

  return { eventType: rawType, slug };
}
