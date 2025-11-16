import EventsManager from "@/components/admin/EventsManager";
import WeddingDetailsForm from "@/components/admin/WeddingDetailsForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Cronograma = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Cronograma do Casamento</h1>
        <p className="text-muted-foreground mt-2">
          Configure os detalhes do casamento e organize os eventos da celebração
        </p>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <WeddingDetailsForm />
        </TabsContent>

        <TabsContent value="events">
          <EventsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cronograma;
