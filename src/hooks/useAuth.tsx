import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = string | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log('🔍 [useAuth] Fetching role for user:', userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("❌ [useAuth] Error fetching user role:", error);
        setRole(null);
      } else {
        const userRole = data?.role ?? null;
        console.log('✅ [useAuth] Role fetched:', userRole);
        setRole(userRole);
      }
    } catch (error) {
      console.error("❌ [useAuth] Exception fetching user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    role,
    loading,
    isAdmin: role === "admin",
  };
};
