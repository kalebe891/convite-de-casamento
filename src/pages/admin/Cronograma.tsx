import TimelineManager from "@/components/admin/TimelineManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Cronograma = () => {
  const permissions = usePagePermissions("cronograma");

  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Cronograma da Cerimônia</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie a linha do tempo dos eventos do seu casamento
        </p>
      </div>
      <TimelineManager permissions={permissions} />
    </div>
  );
};

export default Cronograma;
