import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { timelineEventSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";

interface TimelineManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const TimelineManager = ({ permissions }: TimelineManagerProps) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [showTimelineSection, setShowTimelineSection] = useState<boolean>(true);
  const [newEvent, setNewEvent] = useState({ time: "", activity: "", observation: "", is_public: true });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState({ time: "", activity: "", observation: "", is_public: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id, show_timeline_section")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      setShowTimelineSection(wedding.show_timeline_section ?? true);
      const { data: eventsData } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("time", { ascending: true });
      setEvents(eventsData || []);
    }
  };

  const handleToggleTimelineSection = async (newValue: boolean) => {
    if (!permissions.canPublish) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para publicar/ocultar seções", variant: "destructive" });
      return;
    }
    if (!weddingId) return;

    const { error } = await supabase.from("wedding_details").update({ show_timeline_section: newValue }).eq("id", weddingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Atualizado", description: `Seção de cronograma ${newValue ? 'exibida' : 'oculta'} na página pública` });
      await logAdminAction({ action: "update", tableName: "wedding_details", recordId: weddingId, newData: { show_timeline_section: newValue }, affectedName: "Seção Cronograma" });
      setShowTimelineSection(newValue);
    }
  };

  const handleAdd = async () => {
    if (!weddingId) return;
    if (!permissions.canAdd) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para adicionar itens", variant: "destructive" });
      return;
    }

    const validationResult = timelineEventSchema.safeParse({ time: newEvent.time, activity: newEvent.activity });
    if (!validationResult.success) {
      toast({ title: "Erro de validação", description: validationResult.error.errors[0].message, variant: "destructive" });
      return;
    }

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
      await logAdminAction({ action: "insert", tableName: "timeline_events", recordId: data?.id, newData: newEvent, affectedName: newEvent.activity });
      toast({ title: "Sucesso", description: "Evento adicionado!" });
      setNewEvent({ time: "", activity: "", observation: "", is_public: true });
      fetchData();
    }
  };

  const handleOpenEdit = (event: any) => {
    if (!permissions.canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para editar itens", variant: "destructive" });
      return;
    }
    setEditingId(event.id);
    setEditEvent({
      time: event.time,
      activity: event.activity,
      observation: event.observation || "",
      is_public: event.is_public,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!permissions.canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para editar itens", variant: "destructive" });
      return;
    }

    const validationResult = timelineEventSchema.safeParse({ time: editEvent.time, activity: editEvent.activity });
    if (!validationResult.success) {
      toast({ title: "Erro de validação", description: validationResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    const oldEvent = events.find(e => e.id === editingId);
    const { error } = await supabase
      .from("timeline_events")
      .update({
        time: validationResult.data.time.trim(),
        activity: validationResult.data.activity.trim(),
        observation: editEvent.observation.trim() || null,
        is_public: editEvent.is_public,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({ action: "update", tableName: "timeline_events", recordId: editingId!, oldData: oldEvent, newData: editEvent, affectedName: editEvent.activity });
      toast({ title: "Sucesso", description: "Evento atualizado!" });
      setIsEditOpen(false);
      setEditingId(null);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!permissions.canDelete) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para excluir itens", variant: "destructive" });
      return;
    }
    const deletedEvent = events.find(e => e.id === id);
    const { error } = await supabase.from("timeline_events").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({ action: "delete", tableName: "timeline_events", recordId: id, oldData: deletedEvent, affectedName: deletedEvent?.activity });
      toast({ title: "Sucesso", description: "Evento removido!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, currentValue: boolean) => {
    if (!permissions.canPublish) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para tornar itens públicos/privados", variant: "destructive" });
      return;
    }
    const newValue = !currentValue;
    const { error } = await supabase.from("timeline_events").update({ is_public: newValue }).eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      const item = events.find(e => e.id === id);
      await logAdminAction({ action: "update", tableName: "timeline_events", recordId: id, oldData: { is_public: currentValue }, newData: { is_public: newValue }, affectedName: item?.activity });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade da Seção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_timeline_section">Exibir Seção na Página Pública</Label>
              <p className="text-sm text-muted-foreground">Controla se a seção de cronograma aparece na página pública do convite</p>
            </div>
            <Switch id="show_timeline_section" checked={showTimelineSection} onCheckedChange={handleToggleTimelineSection} disabled={!permissions.canPublish} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Evento ao Cronograma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Horário (HH:MM)</Label>
            <Input type="time" placeholder="Ex: 14:00" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} disabled={!permissions.canAdd} />
          </div>
          <div>
            <Label>Atividade</Label>
            <Input placeholder="Ex: Cerimônia" value={newEvent.activity} onChange={(e) => setNewEvent({ ...newEvent, activity: e.target.value })} disabled={!permissions.canAdd} />
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Input placeholder="Ex: Traje formal" value={newEvent.observation} onChange={(e) => setNewEvent({ ...newEvent, observation: e.target.value })} disabled={!permissions.canAdd} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={newEvent.is_public} onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_public: checked })} disabled={!permissions.canPublish} />
            <Label>Exibir publicamente</Label>
          </div>
          <Button onClick={handleAdd} disabled={!newEvent.time || !newEvent.activity || !permissions.canAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Horário (HH:MM)</Label>
              <Input type="time" value={editEvent.time} onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })} disabled={!permissions.canEdit} />
            </div>
            <div>
              <Label>Atividade</Label>
              <Input value={editEvent.activity} onChange={(e) => setEditEvent({ ...editEvent, activity: e.target.value })} disabled={!permissions.canEdit} />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={editEvent.observation} onChange={(e) => setEditEvent({ ...editEvent, observation: e.target.value })} disabled={!permissions.canEdit} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editEvent.is_public} onCheckedChange={(checked) => setEditEvent({ ...editEvent, is_public: checked })} disabled={!permissions.canPublish} />
              <Label>Exibir publicamente</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdate} disabled={!editEvent.time || !editEvent.activity || !permissions.canEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => setIsEditOpen(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    {event.observation && <p className="text-sm text-muted-foreground mt-1 italic">{event.observation}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={event.is_public} onCheckedChange={() => handleTogglePublic(event.id, event.is_public)} disabled={!permissions.canPublish} />
                    <Button variant="outline" size="icon" onClick={() => handleOpenEdit(event)} disabled={!permissions.canEdit}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(event.id)} disabled={!permissions.canDelete}>
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