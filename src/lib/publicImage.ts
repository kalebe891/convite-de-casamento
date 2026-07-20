import { SITE_URL } from "@/lib/siteUrl";

/**
 * Bucket público onde as fotos dos tenants são armazenadas.
 * Ver `src/components/admin/WeddingPhotosManager.tsx` (upload) e
 * `useHeroMedia.ts` (leitura). Mantido em um único ponto para evitar
 * espalhar o nome do bucket pelo código.
 */
const PUBLIC_STORAGE_BUCKET = "wedding-photos";

/** URL raiz do Storage público do Supabase, derivada da env do projeto. */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");
const PUBLIC_STORAGE_ORIGIN = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_STORAGE_BUCKET}`
  : null;

/** Fallback institucional absoluto (usado quando nenhuma imagem está disponível). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/pwa-512x512.png`;

/**
 * Converte um valor persistido (URL absoluta, path do bucket ou nome de arquivo)
 * em uma URL pública absoluta segura para uso em `og:image` / `twitter:image`.
 *
 * Regras:
 *  - URLs absolutas (`http`/`https`) são preservadas.
 *  - `data:` URIs são preservados.
 *  - Paths relativos são resolvidos contra o bucket público de fotos.
 *  - Valores nulos/inválidos retornam `null` (o consumidor decide o fallback).
 *
 * Esta é a ÚNICA função autorizada a montar URLs públicas de imagens no projeto.
 */
export function resolvePublicImageUrl(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) {
    return raw;
  }

  if (!PUBLIC_STORAGE_ORIGIN) return null;

  const cleaned = raw.replace(/^\/+/, "");
  return `${PUBLIC_STORAGE_ORIGIN}/${cleaned}`;
}
