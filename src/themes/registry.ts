/**
 * Theme Registry — Etapa 20.1
 *
 * Camada arquitetural invisível para suportar múltiplos temas futuramente
 * no tenant público. Nesta etapa apenas o tema "legacy" está registrado,
 * mapeando 1:1 para a implementação atual (nenhuma mudança visual).
 *
 * Não toca em banco, RLS, Edge Functions ou WeddingContext.
 */

import type { ComponentType } from "react";
import Index from "@/pages/Index";

export type TenantThemeId = "legacy";

export interface TenantThemeDefinition {
  id: TenantThemeId;
  label: string;
  /** Componente raiz que renderiza a página pública do tenant para este tema. */
  Renderer: ComponentType;
}

const LEGACY_THEME: TenantThemeDefinition = {
  id: "legacy",
  label: "Legacy (tema atual)",
  Renderer: Index,
};

export const themeRegistry: Record<TenantThemeId, TenantThemeDefinition> = {
  legacy: LEGACY_THEME,
};

export const DEFAULT_THEME_ID: TenantThemeId = "legacy";

/**
 * Resolve um theme_id arbitrário (vindo do banco, query, etc) para um tema
 * válido registrado. Qualquer valor ausente / vazio / inválido cai em legacy.
 */
export function resolveThemeId(input: unknown): TenantThemeId {
  if (typeof input !== "string") return DEFAULT_THEME_ID;
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_THEME_ID;
  if (trimmed in themeRegistry) return trimmed as TenantThemeId;
  return DEFAULT_THEME_ID;
}

export function getThemeDefinition(id: TenantThemeId): TenantThemeDefinition {
  return themeRegistry[id] ?? LEGACY_THEME;
}
