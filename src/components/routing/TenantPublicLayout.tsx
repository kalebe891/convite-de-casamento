import { Outlet } from "react-router-dom";
import { useWedding } from "@/contexts/WeddingContext";
import NotFound from "@/pages/NotFound";

const TenantPublicLayout = () => {
  const { loading, error, weddingId } = useWedding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando evento...</p>
      </div>
    );
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

  return <Outlet />;
};

export default TenantPublicLayout;
