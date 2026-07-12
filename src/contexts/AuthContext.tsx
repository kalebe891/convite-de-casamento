import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { diag, diagTimer, diagCount } from "@/lib/diag";
import DiagLoading from "@/components/diag/DiagLoading";

export type UserRole = string | null;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  /**
   * true enquanto a role está sendo resolvida (existe sessão, mas
   * ainda não sabemos qual a role definitiva). Os Guards devem
   * respeitar este estado — nunca decidir autorização enquanto true.
   * (Etapa 1.24.15.04)
   */
  roleLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — única fonte de verdade da autenticação.
 *
 * Etapa 1.24.15.04 — Preservação da role durante refresh da MESMA sessão:
 *   - TOKEN_REFRESHED / USER_UPDATED / SIGNED_IN com mesmo user.id NÃO
 *     invalidam a role em memória. Apenas revalidam em background.
 *   - Troca de identidade (user.id diferente, SIGNED_OUT) invalida
 *     imediatamente role, cache e permissões derivadas.
 *   - Introduz `roleLoading` explícito para que Guards não interpretem
 *     `role === null` como "sem permissão" durante a janela transitória.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  diagCount("AuthProvider", "render");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const lastFetchedUserIdRef = useRef<string | null>(null);
  const inFlightRoleFetchRef = useRef<Promise<void> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchUserRole = useCallback(
    async (userId: string, opts: { force?: boolean } = {}) => {
      if (!opts.force && lastFetchedUserIdRef.current === userId) {
        diag("AuthProvider", `fetchUserRole skipped (cached) for ${userId}`);
        setRoleLoading(false);
        return;
      }
      if (inFlightRoleFetchRef.current) {
        diag("AuthProvider", "fetchUserRole already in-flight, awaiting");
        return inFlightRoleFetchRef.current;
      }

      const done = diagTimer("AuthProvider", `fetchUserRole(${userId})`);
      const p = (async () => {
        try {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          // Se a identidade mudou durante o fetch, descartar resultado.
          if (currentUserIdRef.current !== userId) {
            diag("AuthProvider", `fetchUserRole result discarded — identity changed`);
            return;
          }

          if (error) {
            console.error("❌ [AuthContext] Error fetching user role:", error);
            setRole(null);
          } else {
            const roles = (data || []).map((item) => item.role as string);
            const userRole = roles.includes("admin") ? "admin" : roles[0] ?? null;
            setRole(userRole);
            diag("AuthProvider", `role resolved = ${userRole ?? "null"}`);
          }
          lastFetchedUserIdRef.current = userId;
        } catch (err) {
          console.error("❌ [AuthContext] Exception fetching user role:", err);
          if (currentUserIdRef.current === userId) setRole(null);
        } finally {
          inFlightRoleFetchRef.current = null;
          if (currentUserIdRef.current === userId) setRoleLoading(false);
          done();
        }
      })();

      inFlightRoleFetchRef.current = p;
      return p;
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    diagCount("AuthProvider", "MOUNT effect");
    diag("AuthProvider", "mounted");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      const nextUserId = nextSession?.user?.id ?? null;
      const prevUserId = currentUserIdRef.current;
      const sameIdentity = nextUserId !== null && nextUserId === prevUserId;

      diag(
        "AuthProvider",
        `onAuthStateChange event=${event} hasUser=${!!nextUserId} sameIdentity=${sameIdentity}`
      );

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextUserId) {
        // Logout ou sessão perdida — invalidar TUDO imediatamente.
        currentUserIdRef.current = null;
        lastFetchedUserIdRef.current = null;
        inFlightRoleFetchRef.current = null;
        setRole(null);
        setRoleLoading(false);
        return;
      }

      if (!sameIdentity) {
        // Troca de identidade: limpar role anterior antes de resolver a nova.
        diag("AuthProvider", `identity change ${prevUserId ?? "null"} → ${nextUserId}`);
        currentUserIdRef.current = nextUserId;
        lastFetchedUserIdRef.current = null;
        setRole(null);
        setRoleLoading(true);
        fetchUserRole(nextUserId);
        return;
      }

      // Mesma identidade (TOKEN_REFRESHED, USER_UPDATED, SIGNED_IN repetido):
      // NÃO limpar role. Apenas revalidar em background se necessário.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        diag("AuthProvider", `same-identity ${event} — preserving role`);
        // opcional: revalidar sem limpar
        // fetchUserRole(nextUserId, { force: true });
        return;
      }

      // Outros eventos de mesma identidade: garantir que a role esteja resolvida.
      if (lastFetchedUserIdRef.current !== nextUserId) {
        fetchUserRole(nextUserId);
      }
    });

    const doneGetSession = diagTimer("AuthProvider", "getSession");
    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      doneGetSession();
      if (!mounted) return;
      const initialUserId = initial?.user?.id ?? null;
      diag("AuthProvider", `initial session hasUser=${!!initialUserId}`);
      setSession(initial);
      setUser(initial?.user ?? null);
      currentUserIdRef.current = initialUserId;

      if (initialUserId) {
        await fetchUserRole(initialUserId);
      } else {
        setRoleLoading(false);
      }

      if (mounted) {
        diag("AuthProvider", "loading=false (initial resolve complete)");
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      diag("AuthProvider", "UNMOUNTED (effect cleanup)");
    };
  }, [fetchUserRole]);

  return (
    <AuthContext.Provider value={{ user, session, role, loading, roleLoading }}>
      {loading ? (
        <DiagLoading source="AuthProvider[loading-splash]" className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Carregando...</p>
        </DiagLoading>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
};
