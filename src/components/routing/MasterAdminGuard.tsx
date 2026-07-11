import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";
import { supabase } from "@/integrations/supabase/client";
import { buildTenantAdminUrl } from "@/lib/eventType";
import { diag, diagTimer } from "@/lib/diag";
import DiagLoading from "@/components/diag/DiagLoading";

interface Props {
  children: ReactNode;
}

/**
 * Guarda da rota /admin (Master Admin global).
 *
 * Fluxo:
 *  1. Não autenticado          -> /auth
 *  2. Autenticado + role admin -> renderiza children
 *  3. Autenticado + tenant     -> redireciona para /:eventType/:slug/admin do primeiro evento vinculado
 *  4. Autenticado sem vínculo  -> /acesso-negado
 */
const MasterAdminGuard = ({ children }: Props) => {
  const { user, loading } = useAuth();
  const { canAccessMasterAdmin, loading: authzLoading } = useAuthorization();
  const [resolving, setResolving] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const mountedAtRef = useRef<number>(0);
  const loggedReadyRef = useRef(false);
  if (mountedAtRef.current === 0) {
    mountedAtRef.current = performance.now();
    diag("MasterAdminGuard", "mounted");
  }

  useEffect(() => {
    diag(
      "MasterAdminGuard",
      `state authLoading=${loading} authzLoading=${authzLoading} hasUser=${!!user} canAccessMasterAdmin=${canAccessMasterAdmin} resolving=${resolving}`
    );
    if (!loading && !authzLoading && !loggedReadyRef.current) {
      const elapsed = Math.round(performance.now() - mountedAtRef.current);
      diag("MasterAdminGuard", `auth+authz ready after mount (${elapsed}ms)`);
      loggedReadyRef.current = true;
    }
  }, [loading, authzLoading, user, canAccessMasterAdmin, resolving]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setRedirectTo("/auth");
      return;
    }

    if (canAccessMasterAdmin) {
      diag("MasterAdminGuard", "granting access — rendering children");
      setRedirectTo(null);
      return;
    }

    // Usuário autenticado sem role admin global: procurar primeiro evento vinculado.
    let cancelled = false;
    setResolving(true);

    (async () => {
      try {
        const { data: idsData, error: idsErr } = await supabase.rpc(
          "get_user_wedding_ids",
          { _user_id: user.id }
        );

        if (cancelled) return;

        if (idsErr) {
          setRedirectTo("/acesso-negado");
          setResolving(false);
          return;
        }

        const ids = (idsData ?? [])
          .map((row: any) =>
            typeof row === "string" ? row : row.get_user_wedding_ids
          )
          .filter(Boolean);

        if (ids.length === 0) {
          setRedirectTo("/acesso-negado");
          setResolving(false);
          return;
        }

        const { data: weddings, error: wErr } = await supabase
          .from("wedding_details")
          .select("slug,event_type")
          .in("id", ids)
          .limit(1);

        if (cancelled) return;

        const first = weddings?.[0];
        const url = first ? buildTenantAdminUrl(first) : null;

        if (wErr || !url) {
          setRedirectTo("/acesso-negado");
        } else {
          setRedirectTo(url);
        }
        setResolving(false);
      } catch {
        if (!cancelled) {
          setRedirectTo("/acesso-negado");
          setResolving(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, canAccessMasterAdmin, loading]);

  if (loading || resolving) {
    return (
      <DiagLoading source={`MasterAdminGuard[loading=${loading} resolving=${resolving}]`} className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </DiagLoading>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default MasterAdminGuard;
