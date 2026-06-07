/**
 * Etapa 1.20.13 — Whitelist de tenants autorizados a usar
 * override de tema via querystring (?theme=…) em produção.
 *
 * Apenas slugs presentes nesta lista permitem preview comercial.
 * Qualquer outro tenant ignora overrides em produção (mantém o
 * tema configurado em wedding_details.theme_id).
 */
export const DEMO_THEME_SLUGS: readonly string[] = ["beatriz-e-diogo"] as const;

export const DEMO_TENANT_SLUG = "beatriz-e-diogo";
export const DEMO_TENANT_EVENT_TYPE = "casamento";

export function isDemoThemeSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return DEMO_THEME_SLUGS.includes(slug);
}
