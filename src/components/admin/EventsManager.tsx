import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { logAdminAction } from "@/lib/adminLogger";

const EventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    event_type: "",
    event_name: "",
    event_date: "",
    location: "",
    address: "",
    maps_url: "",
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("id")
        .single();

      if (weddingData) {
        setWeddingId(weddingData.id);

        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("wedding_id", weddingData.id)
          .order("event_date");

        setEvents(eventsData || []);
      }
    };

    fetchData();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!weddingId) {
      toast({
        title: "Erro",
        description: "Por favor, crie os detalhes do casamento primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("events")
        .insert({
          wedding_id: weddingId,
          event_type: newEvent.event_type,
          event_name: newEvent.event_name,
          event_date: newEvent.event_date,
          location: newEvent.location || null,
          address: newEvent.address || null,
          maps_url: newEvent.maps_url || null,
          description: newEvent.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAdminAction({
        action: "insert",
        tableName: "events",
        recordId: data.id,
        newData: data,
      });

      setEvents([...events, data]);
      setNewEvent({
        event_type: "",
        event_name: "",
        event_date: "",
        location: "",
        address: "",
        maps_url: "",
        description: "",
      });

      toast({
        title: "Sucesso!",
        description: "Evento adicionado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar evento.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const eventToDelete = events.find((e) => e.id === id);
    
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      await logAdminAction({
        action: "delete",
        tableName: "events",
        recordId: id,
        oldData: eventToDelete,
      });

      setEvents(events.filter((e) => e.id !== id));

      toast({
        title: "Sucesso!",
        description: "Evento excluído com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir evento.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-3xl font-serif flex items-center gap-2">
            <Plus className="w-6 h-6" />
            Adicionar Novo Evento
          </CardTitle>
          <CardDescription>Adicione cerimônia, recepção ou outros eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">Tipo do Evento</Label>
                <Input
                  id="event_type"
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                  placeholder="ex: Cerimônia, Recepção"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_name">Nome do Evento</Label>
                <Input
                  id="event_name"
                  value={newEvent.event_name}
                  onChange={(e) => setNewEvent({ ...newEvent, event_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Data & Horário</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Nome do local"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                value={newEvent.address}
                onChange={(e) => setNewEvent({ ...newEvent, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maps_url">URL do Google Maps</Label>
              <Input
                id="maps_url"
                type="url"
                value={newEvent.maps_url}
                onChange={(e) => setNewEvent({ ...newEvent, maps_url: e.target.value })}
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full">Adicionar Evento</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Eventos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento cadastrado ainda.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-start justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{event.event_name}</h3>
                    <p className="text-sm text-muted-foreground">{event.event_type}</p>
                    <p className="text-sm mt-2">{new Date(event.event_date).toLocaleString('pt-BR')}</p>
                    {event.location && <p className="text-sm">📍 {event.location}</p>}
                    {event.address && <p className="text-sm text-muted-foreground">{event.address}</p>}
                    {event.description && <p className="text-sm mt-2">{event.description}</p>}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsManager;
