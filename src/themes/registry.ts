/**
 * Theme Registry — Etapas 20.1 / 20.3
 *
 * Camada arquitetural para suportar múltiplos temas no tenant público.
 * - "legacy"    : implementação original (intocada).
 * - "editorial" : variante editorial (Hero estrutural + tokens CSS).
 */

import type { ComponentType } from "react";
import Index from "@/pages/Index";
import IndexEditorial from "./editorial/IndexEditorial";
import IndexMinimal from "./minimal/IndexMinimal";

export type TenantThemeId = "legacy" | "editorial" | "minimal";

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

const EDITORIAL_THEME: TenantThemeDefinition = {
  id: "editorial",
  label: "Editorial",
  Renderer: IndexEditorial,
};

const MINIMAL_THEME: TenantThemeDefinition = {
  id: "minimal",
  label: "Minimal",
  Renderer: IndexMinimal,
};

export const themeRegistry: Record<TenantThemeId, TenantThemeDefinition> = {
  legacy: LEGACY_THEME,
  editorial: EDITORIAL_THEME,
  minimal: MINIMAL_THEME,
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
