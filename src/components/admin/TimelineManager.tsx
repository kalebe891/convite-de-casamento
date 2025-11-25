import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { timelineEventSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";

const TimelineManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ time: "", activity: "", observation: "", is_public: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      const { data: eventsData } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("time", { ascending: true });
      setEvents(eventsData || []);
    }
  };

  const handleSave = async () => {
    if (!weddingId) return;

    // Validate input data
    const validationResult = timelineEventSchema.safeParse({
      time: newEvent.time,
      activity: newEvent.activity
    });
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({ title: "Erro de validação", description: firstError.message, variant: "destructive" });
      return;
    }

    if (editingId) {
      // Update existing event
      const oldEvent = events.find(e => e.id === editingId);
      const { error } = await supabase
        .from("timeline_events")
        .update({
          time: validationResult.data.time.trim(),
          activity: validationResult.data.activity.trim(),
          observation: newEvent.observation.trim() || null,
          is_public: newEvent.is_public,
        })
        .eq("id", editingId);

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "update",
          tableName: "timeline_events",
          recordId: editingId,
          oldData: oldEvent,
          newData: newEvent,
        });
        toast({ title: "Sucesso", description: "Evento atualizado!" });
        setNewEvent({ time: "", activity: "", observation: "", is_public: true });
        setEditingId(null);
        fetchData();
      }
    } else {
      // Insert new event
      const { data, error } = await supabase.from("timeline_events").insert({
        wedding_id: weddingId,
        time: validationResult.data.time.trim(),
        activity: validationResult.data.activity.trim(),
        observation: newEvent.observation.trim() || null,
        is_public: newEvent.is_public,
        display_order: events.length,
      }).select().single();

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "insert",
          tableName: "timeline_events",
          recordId: data?.id,
          newData: newEvent,
        });
        toast({ title: "Sucesso", description: "Evento adicionado!" });
        setNewEvent({ time: "", activity: "", observation: "", is_public: true });
        fetchData();
      }
    }
  };

  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setNewEvent({
      time: event.time,
      activity: event.activity,
      observation: event.observation || "",
      is_public: event.is_public,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewEvent({ time: "", activity: "", observation: "", is_public: true });
  };

  const handleDelete = async (id: string) => {
    const deletedEvent = events.find(e => e.id === id);
    const { error } = await supabase.from("timeline_events").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({
        action: "delete",
        tableName: "timeline_events",
        recordId: id,
        oldData: deletedEvent,
      });
      toast({ title: "Sucesso", description: "Evento removido!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("timeline_events")
      .update({ is_public: !currentValue })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Evento" : "Adicionar Evento ao Cronograma"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Horário (HH:MM)</Label>
            <Input
              type="time"
              placeholder="Ex: 14:00"
              value={newEvent.time}
              onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
            />
          </div>
          <div>
            <Label>Atividade</Label>
            <Input
              placeholder="Ex: Cerimônia"
              value={newEvent.activity}
              onChange={(e) => setNewEvent({ ...newEvent, activity: e.target.value })}
            />
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Input
              placeholder="Ex: Traje formal"
              value={newEvent.observation}
              onChange={(e) => setNewEvent({ ...newEvent, observation: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newEvent.is_public}
              onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_public: checked })}
            />
            <Label>Exibir publicamente</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!newEvent.time || !newEvent.activity}>
              {editingId ? (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Atualizar
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
            {editingId && (
              <Button onClick={handleCancelEdit} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos do Cronograma</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento adicionado.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{event.time}</p>
                    <p className="text-muted-foreground">{event.activity}</p>
                    {event.observation && (
                      <p className="text-sm text-muted-foreground mt-1 italic">{event.observation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={event.is_public}
                      onCheckedChange={() => handleTogglePublic(event.id, event.is_public)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(event)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimelineManager;
