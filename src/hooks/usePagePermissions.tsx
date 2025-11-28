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
    // Wait for permissions to load
    if (loading) return;

    // Check if user has view permission for this page
    if (!hasPermission(menuKey, "view")) {
      navigate("/acesso-negado", { replace: true });
    }
  }, [menuKey, hasPermission, loading, navigate]);

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
