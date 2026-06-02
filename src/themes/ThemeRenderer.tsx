/**
 * ThemeRenderer — Etapas 20.1 / 20.3 / 20.6
 *
 * Injeta `data-theme` no tenant público e delega a renderização ao componente
 * registrado no themeRegistry. Após a Etapa 20.6, a única fonte de verdade é
 * `wedding.theme_id` persistido no banco. O override por querystring
 * (`?theme=…`) é permitido apenas em ambiente de desenvolvimento.
 */

import { useOptionalWedding } from "@/contexts/WeddingContext";
import { getThemeDefinition, resolveThemeId } from "./registry";

const ThemeRenderer = () => {
  const wedding = useOptionalWedding();

  const devOverride =
    import.meta.env.DEV && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("theme")
      : null;

  const themeId = resolveThemeId(devOverride ?? wedding?.themeId);
  const { Renderer } = getThemeDefinition(themeId);

  return (
    <div data-theme={themeId} className="contents">
      <Renderer />
    </div>
  );
};

export default ThemeRenderer;
