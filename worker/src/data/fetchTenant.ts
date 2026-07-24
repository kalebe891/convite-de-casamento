/**
 * Edge SEO Data Layer — Etapa 1.25.8
 *
 * Consulta pública mínima ao Supabase (PostgREST) para gerar SEO por tenant.
 *
 * Requisitos honrados:
 *  - Sem dependência de `@supabase/supabase-js`, React, DOM ou `window`.
 *  - Configuração via env do Worker (SUPABASE_URL, SUPABASE_ANON_KEY);
 *    nenhuma credencial hardcodada.
 *  - Reutiliza a camada isomórfica (`src/lib/seo/*`) para validação de
 *    `eventType`, slug reservado e resolução da URL pública da foto.
 *  - Timeout explícito com `AbortController`; retorno estruturado sem
 *    exceções vazando para o caller.
 *  - Sem `select(*)`: pede somente as colunas necessárias ao SEO.
 *  - Não consulta dados privados (convidados, RSVP, presentes, tokens,
 *    permissões, auth, etc.).
 *
 * Esta camada NÃO responde HTTP, NÃO renderiza HTML e NÃO faz proxy.
 * Ela apenas devolve dados normalizados prontos para
 * `buildRenderInputFromTenant()` do renderer da Etapa 1.25.7.
 */
import {
  isReservedSlug,
  isValidRouteEventType,
  urlToDb,
  type DbEventType,
  type UrlEventType,
} from "../../../src/lib/seo/eventType";
import { buildPublicImageUrl } from "../../../src/lib/seo/publicImage";
import type { WeddingSeoInput } from "../../../src/lib/seo/tenantSeo";

/** Colunas mínimas de `wedding_details` necessárias para SEO. */
export const TENANT_SEO_COLUMNS = [
  "id",
  "slug",
  "event_type",
  "bride_name",
  "groom_name",
  "wedding_date",
  "venue_name",
  "venue_address",
] as const;

/** Colunas mínimas de `photos` necessárias para a imagem social. */
export const PHOTO_SEO_COLUMNS = ["photo_url", "is_main"] as const;

/** Linha crua de `wedding_details` como retornada pelo PostgREST. */
export interface TenantRow {
  id: string;
  slug: string;
  event_type: DbEventType | string;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
}

/** Env mínimo esperado no Worker para efetuar a consulta. */
export interface FetchTenantEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

/** Injeções opcionais para tornar o módulo 100% testável. */
export interface FetchTenantOptions {
  /** Implementação de `fetch` (default: global `fetch`). */
  fetchImpl?: typeof fetch;
  /** Timeout total da operação, em ms (default: 2500). */
  timeoutMs?: number;
}

/** Resultado normalizado — pronto para `buildRenderInputFromTenant()`. */
export type FetchTenantResult =
  | {
      status: "ok";
      tenant: WeddingSeoInput & { id: string };
      /** URL pública absoluta da foto principal, ou `null`. */
      mainPhoto: string | null;
    }
  | { status: "invalid_params"; reason: InvalidParamReason }
  | { status: "not_found" }
  | { status: "config_error" }
  | { status: "timeout" }
  | { status: "error" };

export type InvalidParamReason =
  | "missing_slug"
  | "invalid_slug"
  | "reserved_slug"
  | "invalid_event_type";

const DEFAULT_TIMEOUT_MS = 2500;
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,127})$/;

function validateSlug(slug: unknown): InvalidParamReason | null {
  if (typeof slug !== "string") return "missing_slug";
  const trimmed = slug.trim();
  if (!trimmed) return "missing_slug";
  if (!SLUG_REGEX.test(trimmed.toLowerCase())) return "invalid_slug";
  if (isReservedSlug(trimmed)) return "reserved_slug";
  return null;
}

/** Timeout via AbortController; devolve `{ timedOut: true }` se estourou. */
async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response?: Response; timedOut?: boolean; networkError?: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    return { response };
  } catch (err) {
    // Nome do erro em AbortController é "AbortError".
    const name = (err as { name?: string } | null)?.name;
    if (name === "AbortError") return { timedOut: true };
    return { networkError: true };
  } finally {
    clearTimeout(timer);
  }
}

function buildRestUrl(
  base: string,
  table: string,
  params: Record<string, string>,
): string {
  const cleanBase = base.replace(/\/+$/, "");
  const qs = new URLSearchParams(params).toString();
  return `${cleanBase}/rest/v1/${table}?${qs}`;
}

/**
 * Consulta pública mínima. Nunca lança — sempre retorna um `FetchTenantResult`.
 *
 * Fluxo:
 *  1. valida `eventType` e `slug` via camada isomórfica;
 *  2. consulta `wedding_details` com filtros estruturados do PostgREST;
 *  3. se encontrar, consulta a foto principal (`photos.is_main=eq.true`);
 *  4. resolve `mainPhoto` como URL absoluta usando `SUPABASE_URL`;
 *  5. retorna dados prontos para `buildRenderInputFromTenant()`.
 */
export async function fetchTenantForSeo(
  eventType: string | UrlEventType,
  slug: string,
  env: FetchTenantEnv,
  options: FetchTenantOptions = {},
): Promise<FetchTenantResult> {
  if (!isValidRouteEventType(eventType)) {
    return { status: "invalid_params", reason: "invalid_event_type" };
  }
  const slugError = validateSlug(slug);
  if (slugError) return { status: "invalid_params", reason: slugError };

  const dbType = urlToDb(eventType);
  if (!dbType) return { status: "invalid_params", reason: "invalid_event_type" };

  const supabaseUrl = env.SUPABASE_URL?.trim();
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return { status: "config_error" };

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const commonHeaders: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };

  // 1) wedding_details ---------------------------------------------------
  const tenantUrl = buildRestUrl(supabaseUrl, "wedding_details", {
    select: TENANT_SEO_COLUMNS.join(","),
    slug: `eq.${slug.trim().toLowerCase()}`,
    event_type: `eq.${dbType}`,
    limit: "1",
  });

  const tenantResp = await fetchWithTimeout(fetchImpl, tenantUrl, {
    method: "GET",
    headers: commonHeaders,
  }, timeoutMs);

  if (tenantResp.timedOut) return { status: "timeout" };
  if (tenantResp.networkError || !tenantResp.response) return { status: "error" };
  if (!tenantResp.response.ok) return { status: "error" };

  let tenantRows: unknown;
  try {
    tenantRows = await tenantResp.response.json();
  } catch {
    return { status: "error" };
  }

  if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
    return { status: "not_found" };
  }

  const row = tenantRows[0] as Partial<TenantRow> | null;
  if (!row || typeof row !== "object") return { status: "error" };
  if (typeof row.id !== "string" || typeof row.slug !== "string") {
    return { status: "error" };
  }
  if (row.event_type !== dbType) return { status: "not_found" };

  const tenant: WeddingSeoInput & { id: string } = {
    id: row.id,
    slug: row.slug,
    event_type: row.event_type,
    bride_name: row.bride_name ?? null,
    groom_name: row.groom_name ?? null,
    wedding_date: row.wedding_date ?? null,
    venue_name: row.venue_name ?? null,
    venue_address: row.venue_address ?? null,
  };

  // 2) foto principal ----------------------------------------------------
  const photoUrl = buildRestUrl(supabaseUrl, "photos", {
    select: PHOTO_SEO_COLUMNS.join(","),
    wedding_id: `eq.${row.id}`,
    is_main: "eq.true",
    limit: "1",
  });

  const photoResp = await fetchWithTimeout(fetchImpl, photoUrl, {
    method: "GET",
    headers: commonHeaders,
  }, timeoutMs);

  let mainPhoto: string | null = null;
  if (photoResp.timedOut) {
    // A foto é acessório do SEO; timeout aqui não invalida o tenant já obtido.
    mainPhoto = null;
  } else if (photoResp.response && photoResp.response.ok) {
    try {
      const photoRows = (await photoResp.response.json()) as unknown;
      if (Array.isArray(photoRows) && photoRows.length > 0) {
        const p = photoRows[0] as { photo_url?: string | null } | null;
        const raw = p && typeof p.photo_url === "string" ? p.photo_url : null;
        mainPhoto = buildPublicImageUrl(raw, { supabaseUrl });
      }
    } catch {
      mainPhoto = null;
    }
  }

  return { status: "ok", tenant, mainPhoto };
}
