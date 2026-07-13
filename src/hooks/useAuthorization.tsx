import { useAuth } from "./useAuth";
import { useOptionalWedding } from "@/contexts/WeddingContext";
import { usePermissions } from "./usePermissions";

/**
 * Camada centralizada de autorização do frontend (Etapa 1.24.00).
 *
 * Custom Hook que consome AuthContext, WeddingContext e a tabela
 * `admin_permissions` (via usePermissions) e expõe respostas semânticas:
 *   - canAccessAdmin
 *   - canAccessMasterAdmin
 *   - canManageGuests
 *   - canManageUsers
 *
 * REGRAS PRESERVADAS:
 *  - Bloqueio definitivo da Demo Expirada (Etapa 1.22.00):
 *    is_demo === true && tenant_status === "archived"  ->  bloqueia acesso administrativo,
 *    independentemente do papel do usuário (owner, admin, planner, etc.).
 *  - Não introduz nenhuma nova permissão. Apenas reutiliza:
 *      • role global (user_roles)
 *      • permissões por menu (admin_permissions via usePermissions)
 *      • estado do tenant (wedding_details.is_demo / tenant_status)
 */
export interface AuthorizationState {
  loading: boolean;
  isAuthenticated: boolean;
  isGlobalAdmin: boolean;
  isDemoExpired: boolean;
  canAccessAdmin: boolean;
  canAccessMasterAdmin: boolean;
  canManageGuests: boolean;
  canManageUsers: boolean;
}

export const useAuthorization = (): AuthorizationState => {
  const { user, role, loading: authLoading, roleLoading } = useAuth();
  const weddingContext = useOptionalWedding();
  const { hasPermission, loading: permsLoading, initialized } = usePermissions();

  const loading =
    authLoading ||
    roleLoading ||
    permsLoading ||
    !initialized ||
    Boolean(weddingContext?.loading);

  const isAuthenticated = !!user;
  const isGlobalAdmin = role === "admin";

  // Bloqueio Demo Expirada (Etapa 1.22.00).
  const wedding = weddingContext?.wedding ?? null;
  const isDemoExpired =
    !!wedding?.is_demo && wedding?.tenant_status === "archived";

  // Acesso administrativo: precisa estar autenticado + permissão de algum
  // módulo OU ser admin global. Bloqueado se demo expirou.
  const baseAdminAccess =
    isAuthenticated &&
    (isGlobalAdmin ||
      hasPermission("detalhes", "view") ||
      hasPermission("convidados", "view") ||
      hasPermission("usuarios", "view"));

  const canAccessAdmin = baseAdminAccess && !isDemoExpired;

  // Master admin (rota global /admin): apenas role admin.
  const canAccessMasterAdmin = isAuthenticated && isGlobalAdmin;

  const canManageGuests =
    canAccessAdmin && hasPermission("convidados", "edit");

  const canManageUsers =
    canAccessAdmin && hasPermission("usuarios", "edit");

  const prevRef = useRef<string>("");
  useEffect(() => {
    const snap = `loading=${loading} authLoading=${authLoading} permsLoading=${permsLoading} initialized=${initialized} weddingLoading=${!!weddingContext?.loading} canAccessMasterAdmin=${canAccessMasterAdmin} isGlobalAdmin=${isGlobalAdmin}`;
    if (snap !== prevRef.current) {
      prevRef.current = snap;
      diag("useAuthorization", snap);
    }
  });

  diagSnap("useAuthorization.compute", {
    authLoading,
    permsLoading,
    initialized,
    role: role ?? "null",
    hasUser: !!user,
    isGlobalAdmin,
    canAccessMasterAdmin,
    loadingOut: loading,
  });


  return {
    loading,
    isAuthenticated,
    isGlobalAdmin,
    isDemoExpired,
    canAccessAdmin,
    canAccessMasterAdmin,
    canManageGuests,
    canManageUsers,
  };
};
