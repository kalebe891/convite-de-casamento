import WeddingDetailsForm from "@/components/admin/WeddingDetailsForm";
import WeddingSettingsForm from "@/components/admin/WeddingSettingsForm";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Detalhes = () => {
  const permissions = usePagePermissions("detalhes");

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
        <h1 className="text-3xl font-serif font-bold">Detalhes do Casamento</h1>
        <p className="text-muted-foreground mt-2">
          Configure as informações principais e configurações do site
        </p>
      </div>
      <WeddingDetailsForm permissions={permissions} />
      <WeddingSettingsForm permissions={permissions} />
    </div>
  );
};

export default Detalhes;
