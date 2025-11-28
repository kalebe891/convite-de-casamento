import EventsManager from "@/components/admin/EventsManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Eventos = () => {
  const permissions = usePagePermissions("eventos");

  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return <EventsManager permissions={permissions} />;
};

export default Eventos;
