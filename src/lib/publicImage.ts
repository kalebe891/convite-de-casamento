/**
 * Adaptador frontend para a camada isomórfica de imagens públicas.
 *
 * A lógica pura vive em `src/lib/seo/publicImage.ts` e é compartilhada
 * com o futuro Cloudflare Worker Edge Renderer. Este módulo apenas
 * injeta valores específicos do ambiente Vite (`import.meta.env`) para
 * preservar a API pré-existente do frontend.
 */
import {
  buildPublicImageUrl,
  defaultOgImage,
  PUBLIC_STORAGE_BUCKET,
} from "@/lib/seo/publicImage";
import { SITE_URL } from "@/lib/seo/siteUrl";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? null;

/** Fallback institucional absoluto (idêntico ao anterior). */
export const DEFAULT_OG_IMAGE = defaultOgImage(SITE_URL);

/** Reexport para consumidores que preferirem importar daqui. */
export { PUBLIC_STORAGE_BUCKET };

/**
 * Wrapper que preserva a assinatura histórica: `resolvePublicImageUrl(value)`.
 * Encaminha para a camada isomórfica passando o `supabaseUrl` do ambiente Vite.
 */
export function resolvePublicImageUrl(value?: string | null): string | null {
  return buildPublicImageUrl(value, { supabaseUrl: SUPABASE_URL });
}
