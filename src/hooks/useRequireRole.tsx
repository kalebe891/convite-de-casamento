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
  const { hasPermission, loading: permissionsLoading, initialized } = usePermissions();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('🔄 [useRequireRole] Effect triggered:', {
      authLoading,
      permissionsLoading,
      initialized,
      hasRedirected,
      user: user?.id,
      role,
      pathname: location.pathname
    });

    // Aguardar carregamento completo
    if (authLoading || permissionsLoading || !initialized || hasRedirected) {
      console.log('⏸️ [useRequireRole] Waiting:', {
        authLoading,
        permissionsLoading,
        initialized,
        hasRedirected
      });
      return;
    }

    if (!user) {
      console.log('🚫 [useRequireRole] No user, redirecting to /auth');
      navigate("/auth", { replace: true });
      return;
    }

    if (role !== null) {
      // Verificar se tem permissão de role
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      console.log('🔐 [useRequireRole] Checking role access:', { role, allowedRoles });
      
      if (!allowedRoles.includes(role)) {
        console.log('❌ [useRequireRole] Role not allowed, redirecting to /acesso-negado');
        navigate("/acesso-negado", { replace: true });
        setHasRedirected(true);
        return;
      }

      // Se está na rota genérica /admin, redirecionar para o primeiro menu permitido
      if (location.pathname === "/admin" || location.pathname === "/admin/") {
        console.log('🔀 [useRequireRole] On /admin, finding first accessible menu');
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
          console.log(`🔍 [useRequireRole] Checking menu: ${menu.menuKey}`);
          // Se é adminOnly e não é admin, pular
          if (menu.adminOnly && role !== "admin") {
            console.log(`  ⏭️ Admin-only menu, skipping`);
            return false;
          }
          // Verificar permissão de visualização
          const hasAccess = hasPermission(menu.menuKey, "view");
          console.log(`  ${hasAccess ? '✅' : '❌'} Access: ${hasAccess}`);
          return hasAccess;
        });

        if (firstAllowedMenu) {
          console.log('✅ [useRequireRole] First accessible menu found:', firstAllowedMenu.url);
          navigate(firstAllowedMenu.url, { replace: true });
          setHasRedirected(true);
        } else {
          console.log('❌ [useRequireRole] No accessible menu found, redirecting to /acesso-negado');
          navigate("/acesso-negado", { replace: true });
          setHasRedirected(true);
        }
      } else {
        console.log('✅ [useRequireRole] User on specific page:', location.pathname);
      }
    }
  }, [user, role, authLoading, permissionsLoading, initialized, navigate, requiredRole, location.pathname, hasPermission, hasRedirected]);

  return { user, role, loading: authLoading || permissionsLoading };
};
