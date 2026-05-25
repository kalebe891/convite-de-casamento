import { useNavigate } from "react-router-dom";
import { usePermissions } from "./usePermissions";
import { useAuth } from "./useAuth";
import { MenuKey } from "@/lib/permissions";
import { useEffect } from "react";
import { useAdminBasePath } from "./useAdminBasePath";
import { useOptionalWedding } from "@/contexts/WeddingContext";

const TENANT_MENU_ORDER: MenuKey[] = [
  "detalhes",
  "usuarios",
  "eventos",
  "convidados",
  "checkin",
  "presentes",
  "cronograma",
  "buffet",
  "playlist",
  "momentos",
  "estatisticas",
  "logs",
];

/**
 * Hook para controlar permissões dentro de uma página específica
 * Redireciona para acesso negado se o usuário não tiver permissão
 */
export const usePagePermissions = (menuKey: MenuKey) => {
  const navigate = useNavigate();
  const { hasPermission, loading, initialized } = usePermissions();
  const { role } = useAuth();
  const adminBasePath = useAdminBasePath();
  const weddingContext = useOptionalWedding();

  useEffect(() => {
    console.log(`🔍 [usePagePermissions] Checking access to page: ${menuKey}`, { loading, role });
    
    // CRITICAL: Wait for permissions to be fully initialized
    if (loading || !initialized || adminBasePath === null) {
      console.log(`⏳ [usePagePermissions] Still loading permissions for ${menuKey}`);
      return;
    }

    // Now check if user has view permission for this page
    const canAccess = hasPermission(menuKey, "view");
    console.log(`🔍 [usePagePermissions] Permission check result for ${menuKey}:`, canAccess);
    
    if (!canAccess) {
      if (weddingContext?.mode === "tenant-admin") {
        const firstAllowedMenu = TENANT_MENU_ORDER.find((item) => hasPermission(item, "view"));

        if (firstAllowedMenu && firstAllowedMenu !== menuKey) {
          console.log(`🔀 [usePagePermissions] Redirecting tenant user to first allowed page: ${firstAllowedMenu}`);
          navigate(`${adminBasePath}/${firstAllowedMenu}`, { replace: true });
          return;
        }
      }

      console.log(`❌ [usePagePermissions] No view permission for ${menuKey}, redirecting to /acesso-negado`);
      navigate("/acesso-negado", { replace: true });
    } else {
      console.log(`✅ [usePagePermissions] Access granted to ${menuKey}`);
    }
  }, [menuKey, hasPermission, loading, initialized, navigate, role, adminBasePath, weddingContext?.mode]);

  return {
    canView: hasPermission(menuKey, "view"),
    canAdd: hasPermission(menuKey, "add"),
    canEdit: hasPermission(menuKey, "edit"),
    canDelete: hasPermission(menuKey, "delete"),
    canPublish: hasPermission(menuKey, "publish"),
    isAdmin: role === "admin",
    loading: loading || !initialized || adminBasePath === null,
  };
};
