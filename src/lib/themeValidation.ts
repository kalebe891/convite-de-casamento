/**
 * Theme Validation — Etapa 1.21.01
 *
 * Camada de blindagem administrativa para detectar tenants vinculados
 * a theme_ids inexistentes / não registrados no ThemeRegistry.
 *
 * Fonte única da verdade: themeRegistry (src/themes/registry.ts).
 * Não duplicar arrays de temas válidos.
 *
 * O fallback visual (resolveThemeId → legacy) permanece intacto.
 * Esta camada apenas adiciona monitoramento + correção administrativa.
 */

import { themeRegistry, type TenantThemeId } from "@/themes/registry";

/** Retorna a lista de theme_ids válidos atualmente registrados. */
export function getValidThemeIds(): TenantThemeId[] {
  return Object.keys(themeRegistry) as TenantThemeId[];
}

/**
 * Indica se o valor recebido corresponde a um tema registrado.
 * `null`, `undefined` e strings vazias são tratados como inválidos
 * (do ponto de vista administrativo — o fallback visual continua sendo legacy).
 */
export function isValidThemeId(themeId: unknown): boolean {
  if (typeof themeId !== "string") return false;
  const trimmed = themeId.trim();
  if (!trimmed) return false;
  return trimmed in themeRegistry;
}
