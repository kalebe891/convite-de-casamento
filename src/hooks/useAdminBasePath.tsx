import { useWedding } from "@/contexts/WeddingContext";
import { buildTenantAdminUrl } from "@/lib/eventType";

/**
 * Retorna o prefixo base correto para o painel administrativo,
 * conforme o modo do WeddingContext.
 *
 * - mode "admin"        -> "/admin"
 * - mode "tenant-admin" -> "/:eventType/:slug/admin" (ou null enquanto carrega)
 * - outros              -> "/admin" (fallback)
 */
export function useAdminBasePath(): string | null {
  const { mode, wedding, loading } = useWedding();

  if (mode === "tenant-admin") {
    if (loading || !wedding) return null;
    return buildTenantAdminUrl(wedding);
  }

  return "/admin";
}
