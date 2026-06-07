/**
 * ThemeRenderer — Etapas 20.1 / 20.3 / 20.6
 *
 * Injeta `data-theme` no tenant público e delega a renderização ao componente
 * registrado no themeRegistry. Após a Etapa 20.6, a única fonte de verdade é
 * `wedding.theme_id` persistido no banco. O override por querystring
 * (`?theme=…`) é permitido apenas em ambiente de desenvolvimento.
 */

import { useOptionalWedding } from "@/contexts/WeddingContext";
import { isDemoThemeSlug } from "@/lib/themePreviewWhitelist";
import { getThemeDefinition, resolveThemeId } from "./registry";

const ThemeRenderer = () => {
  const wedding = useOptionalWedding();

  // Override por querystring: permitido em dev sempre, e em produção
  // apenas para slugs explicitamente autorizados na whitelist
  // (Etapa 1.20.13 — Showcase Comercial dos Temas).
  const queryOverride =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("theme")
      : null;

  const allowOverride =
    !!queryOverride &&
    (import.meta.env.DEV || isDemoThemeSlug(wedding?.slug));

  const themeId = resolveThemeId(
    allowOverride ? queryOverride : wedding?.themeId
  );
  const { Renderer } = getThemeDefinition(themeId);

  return (
    <div data-theme={themeId} className="contents">
      <Renderer />
    </div>
  );
};

export default ThemeRenderer;
