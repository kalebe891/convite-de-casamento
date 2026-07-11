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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — única fonte de verdade da autenticação (Etapa 1.24.13).
 *
 * Regras:
 *  - Único getSession() inicial.
 *  - Único onAuthStateChange listener em toda a aplicação.
 *  - Única consulta a user_roles por usuário (cache via useRef).
 *  - Bloqueia render de children até o primeiro getSession() concluir
 *    (evita race: loading=false + user=null → redirect indevido para /auth).
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const lastFetchedUserIdRef = useRef<string | null>(null);
  const inFlightRoleFetchRef = useRef<Promise<void> | null>(null);

  const fetchUserRole = useCallback(async (userId: string) => {
    if (lastFetchedUserIdRef.current === userId) {
      diag("AuthProvider", `fetchUserRole skipped (cached) for ${userId}`);
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
        setRole(null);
      } finally {
        inFlightRoleFetchRef.current = null;
        done();
      }
    })();

    inFlightRoleFetchRef.current = p;
    return p;
  }, []);

  useEffect(() => {
    let mounted = true;
    diag("AuthProvider", "mounted");

    // Listener único (registrado ANTES de getSession, como recomendado pelo Supabase).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      diag("AuthProvider", `onAuthStateChange event=${event} hasUser=${!!nextSession?.user}`);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        // defer para evitar deadlock com o próprio callback
        setTimeout(() => {
          if (!mounted) return;
          fetchUserRole(nextSession.user.id);
        }, 0);
      } else {
        lastFetchedUserIdRef.current = null;
        setRole(null);
      }
    });

    // getSession único.
    const doneGetSession = diagTimer("AuthProvider", "getSession");
    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      doneGetSession();
      if (!mounted) return;
      diag("AuthProvider", `initial session hasUser=${!!initial?.user}`);
      setSession(initial);
      setUser(initial?.user ?? null);

      if (initial?.user) {
        await fetchUserRole(initial.user.id);
      }

      if (mounted) {
        diag("AuthProvider", "loading=false (initial resolve complete)");
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
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
