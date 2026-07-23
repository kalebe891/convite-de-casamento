/**
 * Camada isomórfica — resolução de URLs públicas de imagens de tenant.
 *
 * Pura: sem acesso a `import.meta.env`, `window` ou `document`. O caller
 * (frontend ou Worker) injeta a origem do Storage e a URL do site.
 */
import { SITE_URL } from "./siteUrl";

/** Bucket público onde as fotos dos tenants são armazenadas. */
export const PUBLIC_STORAGE_BUCKET = "wedding-photos";

/** Fallback institucional absoluto (usado quando nenhuma imagem está disponível). */
export function defaultOgImage(siteUrl: string = SITE_URL): string {
  return `${siteUrl.replace(/\/+$/, "")}/pwa-512x512.png`;
}

export interface PublicImageOptions {
  /** URL do projeto Supabase (ex.: https://xxx.supabase.co). Opcional. */
  supabaseUrl?: string | null;
  /** Nome do bucket público. Default: `wedding-photos`. */
  bucket?: string;
}

/**
 * Converte um valor persistido (URL absoluta, path do bucket ou nome de
 * arquivo) em URL pública absoluta, ou `null` quando não for possível.
 *
 * Regras:
 *  - `http(s)://` e `data:` são preservados;
 *  - paths relativos são resolvidos contra o bucket público informado;
 *  - sem `supabaseUrl` disponível, retorna `null` (caller decide fallback).
 */
export function buildPublicImageUrl(
  value: string | null | undefined,
  options: PublicImageOptions = {}
): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) {
    return raw;
  }

  const supabaseUrl = options.supabaseUrl?.replace(/\/+$/, "");
  if (!supabaseUrl) return null;

  const bucket = options.bucket ?? PUBLIC_STORAGE_BUCKET;
  const cleaned = raw.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleaned}`;
}
