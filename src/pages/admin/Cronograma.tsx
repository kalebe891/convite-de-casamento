import TimelineManager from "@/components/admin/TimelineManager";

const Cronograma = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Cronograma da Cerimônia</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie a linha do tempo dos eventos do seu casamento
        </p>
      </div>
      <TimelineManager />
    </div>
  );
};

export default Cronograma;
