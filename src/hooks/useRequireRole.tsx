import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "./useAuth";
import { usePermissions } from "./usePermissions";
import { MenuKey, MENU_LABELS } from "@/lib/permissions";
import { devLog } from "@/lib/devLog";

/**
 * Hook que garante que o usuário tem o papel necessário.
 * Redireciona para /auth se não estiver logado.
 * Redireciona para /acesso-negado se não tiver permissão.
 * Redireciona para o primeiro menu permitido após login.
 */
export const useRequireRole = (requiredRole: string | string[]) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading, roleLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading, initialized } = usePermissions();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (authLoading || roleLoading || permissionsLoading || !initialized) {
      return;
    }

    if (hasRedirected) {
      return;
    }

    if (!user) {
      devLog('🚫 [useRequireRole] No user, redirecting to /auth');
      navigate("/auth", { replace: true });
      setHasRedirected(true);
      return;
    }

    if (role !== null) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      if (!allowedRoles.includes(role)) {
        devLog('❌ [useRequireRole] Role not allowed:', role);
        navigate("/acesso-negado", { replace: true });
        setHasRedirected(true);
        return;
      }

      if (location.pathname === "/admin" || location.pathname === "/admin/") {
        const allMenus: { menuKey: MenuKey; path: string; adminOnly: boolean }[] = [
          { menuKey: "detalhes", path: "detalhes", adminOnly: false },
          { menuKey: "usuarios", path: "usuarios", adminOnly: true },
          { menuKey: "eventos", path: "eventos", adminOnly: false },
          { menuKey: "convidados", path: "convidados", adminOnly: false },
          { menuKey: "checkin", path: "checkin", adminOnly: false },
          { menuKey: "presentes", path: "presentes", adminOnly: false },
          { menuKey: "cronograma", path: "cronograma", adminOnly: false },
          { menuKey: "buffet", path: "buffet", adminOnly: false },
          { menuKey: "playlist", path: "playlist", adminOnly: false },
          { menuKey: "momentos", path: "momentos", adminOnly: false },
          { menuKey: "estatisticas", path: "estatisticas", adminOnly: false },
          { menuKey: "logs", path: "logs", adminOnly: false },
        ];

        const firstAllowedMenu = allMenus.find((menu) => {
          if (menu.adminOnly && role !== "admin") return false;
          return hasPermission(menu.menuKey, "view");
        });

        if (firstAllowedMenu) {
          navigate(`/admin/${firstAllowedMenu.path}`, { replace: true });
          setHasRedirected(true);
        } else {
          navigate("/acesso-negado", { replace: true });
          setHasRedirected(true);
        }
      }
    }
  }, [user, role, authLoading, permissionsLoading, initialized, navigate, requiredRole, location.pathname, hasPermission, hasRedirected]);

  return { user, role, loading: authLoading || permissionsLoading };
};
