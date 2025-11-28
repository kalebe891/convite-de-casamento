import WeddingPhotosManager from "@/components/admin/WeddingPhotosManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Momentos = () => {
  const permissions = usePagePermissions("momentos");

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
        <h1 className="text-3xl font-serif font-bold">Galeria de Momentos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as fotos exibidas na galeria do site
        </p>
      </div>
      <WeddingPhotosManager permissions={permissions} />
    </div>
  );
};

export default Momentos;
