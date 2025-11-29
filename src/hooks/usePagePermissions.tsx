import { useNavigate } from "react-router-dom";
import { usePermissions } from "./usePermissions";
import { useAuth } from "./useAuth";
import { MenuKey } from "@/lib/permissions";
import { useEffect } from "react";

/**
 * Hook para controlar permissões dentro de uma página específica
 * Redireciona para acesso negado se o usuário não tiver permissão
 */
export const usePagePermissions = (menuKey: MenuKey) => {
  const navigate = useNavigate();
  const { hasPermission, loading } = usePermissions();
  const { role } = useAuth();

  useEffect(() => {
    console.log(`🔍 [usePagePermissions] Checking access to page: ${menuKey}`, { loading, role });
    
    // CRITICAL: Wait for permissions to be fully initialized
    if (loading) {
      console.log(`⏳ [usePagePermissions] Still loading permissions for ${menuKey}`);
      return;
    }

    // Now check if user has view permission for this page
    const canAccess = hasPermission(menuKey, "view");
    console.log(`🔍 [usePagePermissions] Permission check result for ${menuKey}:`, canAccess);
    
    if (!canAccess) {
      console.log(`❌ [usePagePermissions] No view permission for ${menuKey}, redirecting to /acesso-negado`);
      navigate("/acesso-negado", { replace: true });
    } else {
      console.log(`✅ [usePagePermissions] Access granted to ${menuKey}`);
    }
  }, [menuKey, hasPermission, loading, navigate, role]);

  return {
    canView: hasPermission(menuKey, "view"),
    canAdd: hasPermission(menuKey, "add"),
    canEdit: hasPermission(menuKey, "edit"),
    canDelete: hasPermission(menuKey, "delete"),
    canPublish: hasPermission(menuKey, "publish"),
    isAdmin: role === "admin",
    loading,
  };
};
