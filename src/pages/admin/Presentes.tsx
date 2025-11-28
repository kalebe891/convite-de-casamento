import GiftManager from "@/components/admin/GiftManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Presentes = () => {
  const permissions = usePagePermissions("presentes");

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
        <h1 className="text-3xl font-serif font-bold">Lista de Presentes</h1>
        <p className="text-muted-foreground mt-2">
          Configure os presentes que os convidados podem presentear
        </p>
      </div>
      <GiftManager permissions={permissions} />
    </div>
  );
};

export default Presentes;
