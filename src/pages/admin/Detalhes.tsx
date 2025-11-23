import WeddingDetailsForm from "@/components/admin/WeddingDetailsForm";
import WeddingSettingsForm from "@/components/admin/WeddingSettingsForm";
import WeddingPhotosManager from "@/components/admin/WeddingPhotosManager";

const Detalhes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Detalhes do Casamento</h1>
        <p className="text-muted-foreground mt-2">
          Configure as informações principais e configurações do site
        </p>
      </div>
      <WeddingDetailsForm />
      <WeddingSettingsForm />
      <WeddingPhotosManager />
    </div>
  );
};

export default Detalhes;
