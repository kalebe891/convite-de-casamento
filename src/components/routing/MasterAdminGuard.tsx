import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildTenantAdminUrl } from "@/lib/eventType";

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
  const { user, role, loading } = useAuth();
  const [resolving, setResolving] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setRedirectTo("/auth");
      return;
    }

    if (role === "admin") {
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
  }, [user, role, loading]);

  if (loading || resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default MasterAdminGuard;
