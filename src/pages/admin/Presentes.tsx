import GiftManager from "@/components/admin/GiftManager";

const Presentes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Lista de Presentes</h1>
        <p className="text-muted-foreground mt-2">
          Configure os presentes que os convidados podem presentear
        </p>
      </div>
      <GiftManager />
    </div>
  );
};

export default Presentes;
