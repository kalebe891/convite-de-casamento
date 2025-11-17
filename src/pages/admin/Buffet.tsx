import BuffetManager from "@/components/admin/BuffetManager";

const Buffet = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Cardápio do Buffet</h1>
        <p className="text-muted-foreground mt-2">
          Configure o menu que será servido no seu casamento
        </p>
      </div>
      <BuffetManager />
    </div>
  );
};

export default Buffet;
