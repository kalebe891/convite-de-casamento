import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWedding } from "@/contexts/WeddingContext";
import NotFound from "@/pages/NotFound";

interface Props {
  children: ReactNode;
}

const TenantAdminGuard = ({ children }: Props) => {
  const { loading, error, weddingId } = useWedding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando painel...</p>
      </div>
    );
  }

  if (error === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  if (error === "access_denied") {
    return <Navigate to="/acesso-negado" replace />;
  }

  if (
    error === "not_found" ||
    error === "invalid_event_type" ||
    error === "reserved_slug" ||
    error === "missing_slug" ||
    !weddingId
  ) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export default TenantAdminGuard;
