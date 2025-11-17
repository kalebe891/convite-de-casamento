import GuestsManager from "@/components/admin/GuestsManager";
import InvitationsManager from "@/components/admin/InvitationsManager";
import RSVPList from "@/components/admin/RSVPList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Convidados = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Gerenciar Convidados</h1>
        <p className="text-muted-foreground mt-2">
          Crie convites personalizados e acompanhe as confirmações de presença
        </p>
      </div>

      <Tabs defaultValue="guests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="guests">Convidados</TabsTrigger>
          <TabsTrigger value="invitations">Convites</TabsTrigger>
          <TabsTrigger value="rsvps">Confirmações</TabsTrigger>
        </TabsList>

        <TabsContent value="guests">
          <GuestsManager />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsManager />
        </TabsContent>

        <TabsContent value="rsvps">
          <RSVPList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Convidados;
