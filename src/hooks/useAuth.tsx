import { useAuthContext } from "@/contexts/AuthContext";
import { useOptionalWedding } from "@/contexts/WeddingContext";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = string | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
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
  const { user, session, role, loading } = useAuthContext();
  const weddingContext = useOptionalWedding();

  const tenantRole =
    weddingContext?.mode === "tenant-admin" && weddingContext.weddingId
      ? weddingContext.userWeddings.find(
          (link) =>
            link.user_id === user?.id &&
            link.wedding_id === weddingContext.weddingId
        )?.role ?? null
      : null;

  const effectiveRole = tenantRole ?? role;

  return {
    user,
    session,
    role: effectiveRole,
    loading:
      loading ||
      Boolean(weddingContext?.mode === "tenant-admin" && weddingContext.loading),
    isAdmin: effectiveRole === "admin",
  };
};
