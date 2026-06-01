/**
 * ThemeRenderer — Etapa 20.1
 *
 * Injeta `data-theme` no tenant público e delega a renderização ao componente
 * registrado no themeRegistry. Hoje só existe "legacy", então o output é
 * pixel-idêntico à implementação anterior.
 */

import { useOptionalWedding } from "@/contexts/WeddingContext";
import { getThemeDefinition, resolveThemeId } from "./registry";

const ThemeRenderer = () => {
  const wedding = useOptionalWedding();
  const themeId = resolveThemeId(wedding?.themeId);
  const { Renderer } = getThemeDefinition(themeId);

  return (
    <div data-theme={themeId} className="contents">
      <Renderer />
    </div>
  );
};

export default ThemeRenderer;
