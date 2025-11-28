import BuffetManager from "@/components/admin/BuffetManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Buffet = () => {
  const permissions = usePagePermissions("buffet");

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
        <h1 className="text-3xl font-serif font-bold">Cardápio do Buffet</h1>
        <p className="text-muted-foreground mt-2">
          Configure o menu que será servido no seu casamento
        </p>
      </div>
      <BuffetManager permissions={permissions} />
    </div>
  );
};

export default Buffet;
