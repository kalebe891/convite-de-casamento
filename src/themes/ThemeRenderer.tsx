/**
 * ThemeRenderer — Etapas 20.1 / 20.3
 *
 * Injeta `data-theme` no tenant público e delega a renderização ao componente
 * registrado no themeRegistry. Permite override temporário via querystring
 * (`?theme=editorial`) para preview sem migração de banco.
 */

import { useOptionalWedding } from "@/contexts/WeddingContext";
import { getThemeDefinition, resolveThemeId } from "./registry";

const ThemeRenderer = () => {
  const wedding = useOptionalWedding();
  const queryOverride =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("theme")
      : null;

  const themeId = resolveThemeId(queryOverride ?? wedding?.themeId);
  const { Renderer } = getThemeDefinition(themeId);

  return (
    <div data-theme={themeId} className="contents">
      <Renderer />
    </div>
  );
};

export default ThemeRenderer;
