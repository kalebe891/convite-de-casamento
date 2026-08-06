import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOptionalWedding } from "@/contexts/WeddingContext";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = string | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  roleLoading: boolean;
  /**
   * Papel global de plataforma (user_roles), independente do tenant atual.
   * Etapa 1.28.02 — usado apenas para decisões de PLATAFORMA (Master Admin).
   */
  platformRole: UserRole;
  /** true somente para admin global de plataforma (user_roles.role = 'admin'). */
  isPlatformAdmin: boolean;
  /** @deprecated use isPlatformAdmin (plataforma) ou permissões por tenant. */
  isAdmin: boolean;
}


/**
 * useAuth — consumidor do AuthContext global (Etapa 1.24.13).
 *
 * Toda a lógica (getSession, onAuthStateChange, fetchUserRole) vive
 * em `AuthProvider`. Este hook apenas lê o contexto e aplica o override
 * de role por tenant (compat com Etapas anteriores), sem estado próprio.
 */
export const useAuth = (): AuthState => {
  const { user, session, role, loading, roleLoading } = useAuthContext();
  const weddingContext = useOptionalWedding();

  const tenantRole =
    weddingContext?.mode === "tenant-admin" && weddingContext.weddingId
      ? weddingContext.userWeddings.find(
          (link) =>
            link.user_id === user?.id &&
            link.wedding_id === weddingContext.weddingId
        )?.role ?? null
      : null;

  const weddingLoading = Boolean(
    weddingContext?.mode === "tenant-admin" && weddingContext.loading
  );

  return useMemo<AuthState>(() => {
    const effectiveRole = tenantRole ?? role;
    const isPlatformAdmin = role === "admin";
    return {
      user,
      session,
      role: effectiveRole,
      loading: loading || weddingLoading,
      roleLoading,
      platformRole: role,
      isPlatformAdmin,
      isAdmin: isPlatformAdmin,
    };
  }, [user, session, role, tenantRole, loading, weddingLoading, roleLoading]);
};

