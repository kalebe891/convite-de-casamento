import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "./useAuth";
import { usePermissions } from "./usePermissions";
import { MenuKey, MENU_LABELS } from "@/lib/permissions";

/**
 * Hook que garante que o usuário tem o papel necessário.
 * Redireciona para /auth se não estiver logado.
 * Redireciona para /acesso-negado se não tiver permissão.
 * Redireciona para o primeiro menu permitido após login.
 */
export const useRequireRole = (requiredRole: string | string[]) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (authLoading || permissionsLoading || hasRedirected) return;

    if (!user) {
      // Não autenticado
      navigate("/auth", { replace: true });
      return;
    }

    if (role !== null) {
      // Verificar se tem permissão de role
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      if (!allowedRoles.includes(role)) {
        // Não tem permissão de role
        navigate("/acesso-negado", { replace: true });
        setHasRedirected(true);
        return;
      }

      // Se está na rota genérica /admin, redirecionar para o primeiro menu permitido
      if (location.pathname === "/admin" || location.pathname === "/admin/") {
        const allMenus: { menuKey: MenuKey; url: string; adminOnly: boolean }[] = [
          { menuKey: "detalhes", url: "/admin/detalhes", adminOnly: false },
          { menuKey: "usuarios", url: "/admin/usuarios", adminOnly: true },
          { menuKey: "eventos", url: "/admin/eventos", adminOnly: false },
          { menuKey: "convidados", url: "/admin/convidados", adminOnly: false },
          { menuKey: "checkin", url: "/admin/checkin", adminOnly: false },
          { menuKey: "presentes", url: "/admin/presentes", adminOnly: false },
          { menuKey: "cronograma", url: "/admin/cronograma", adminOnly: false },
          { menuKey: "buffet", url: "/admin/buffet", adminOnly: false },
          { menuKey: "playlist", url: "/admin/playlist", adminOnly: false },
          { menuKey: "momentos", url: "/admin/momentos", adminOnly: false },
          { menuKey: "estatisticas", url: "/admin/estatisticas", adminOnly: false },
          { menuKey: "logs", url: "/admin/logs", adminOnly: false },
        ];

        // Encontrar o primeiro menu que o usuário tem permissão
        const firstAllowedMenu = allMenus.find((menu) => {
          // Se é adminOnly e não é admin, pular
          if (menu.adminOnly && role !== "admin") return false;
          // Verificar permissão de visualização
          return hasPermission(menu.menuKey, "view");
        });

        if (firstAllowedMenu) {
          navigate(firstAllowedMenu.url, { replace: true });
          setHasRedirected(true);
        } else {
          // Nenhum menu permitido, vai para acesso negado
          navigate("/acesso-negado", { replace: true });
          setHasRedirected(true);
        }
      }
    }
  }, [user, role, authLoading, permissionsLoading, navigate, requiredRole, location.pathname, hasPermission, hasRedirected]);

  return { user, role, loading: authLoading || permissionsLoading };
};
