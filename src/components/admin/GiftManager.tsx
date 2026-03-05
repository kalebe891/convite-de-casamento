import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, X, PackageCheck, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";

interface GiftManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const GiftManager = ({ permissions }: GiftManagerProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [showGiftsSection, setShowGiftsSection] = useState<boolean>(true);
  const [hideReservedGifts, setHideReservedGifts] = useState<boolean>(false);
  const [newItem, setNewItem] = useState({ 
    gift_name: "", 
    description: "", 
    link: "",
    is_public: true 
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState({
    gift_name: "",
    description: "",
    link: "",
    is_public: true,
    selected_by_guest_id: "" as string | null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id, show_gifts_section, hide_reserved_gifts")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      setShowGiftsSection(wedding.show_gifts_section ?? true);
      setHideReservedGifts(wedding.hide_reserved_gifts ?? false);
      const { data: itemsData } = await supabase
        .from("gift_items")
        .select(`
          *,
          guest:guests(id, name)
        `)
        .eq("wedding_id", wedding.id)
        .order("gift_name", { ascending: true });
      setItems(itemsData || []);

      // Fetch all guests as source of truth for linking
      const { data: guestsData } = await supabase
        .from("guests")
        .select("id, name, status")
        .is("archived_at", null)
        .order("name")
        .limit(1000);

      const guestsList = (guestsData || []).map((guest) => ({
        id: guest.id,
        guest_name: guest.name,
        status: guest.status,
      }));
      setInvitations(guestsList.sort((a, b) => a.guest_name.localeCompare(b.guest_name)));
    }
  };

  const handleAdd = async () => {
    if (!weddingId || !newItem.gift_name.trim()) {
      toast({ title: "Erro", description: "Nome do presente é obrigatório", variant: "destructive" });
      return;
    }

    if (!permissions.canAdd) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para adicionar itens", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.from("gift_items").insert({
      wedding_id: weddingId,
      gift_name: newItem.gift_name.trim(),
      description: newItem.description.trim() || null,
      link: newItem.link.trim() || null,
      is_public: newItem.is_public,
      display_order: items.length,
    }).select().single();

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({ action: "insert", tableName: "gift_items", recordId: data?.id, newData: newItem, affectedName: newItem.gift_name });
      toast({ title: "Sucesso", description: "Presente adicionado!" });
      setNewItem({ gift_name: "", description: "", link: "", is_public: true });
      fetchData();
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setEditItem({
      gift_name: item.gift_name,
      description: item.description || "",
      link: item.link || "",
      is_public: item.is_public,
      selected_by_guest_id: item.selected_by_guest_id || "",
    });
    setIsEditOpen(true);
  };

  const handleToggleReceived = async (item: any) => {
    const newValue = !item.is_purchased;
    const { error } = await supabase
      .from("gift_items")
      .update({ is_purchased: newValue })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({
        action: newValue ? "gift_received" : "gift_cancelled",
        tableName: "gift_items",
        recordId: item.id,
        oldData: { is_purchased: !newValue, gift_name: item.gift_name },
        newData: { is_purchased: newValue, gift_name: item.gift_name },
        affectedName: item.gift_name,
      });
      toast({
        title: newValue ? "Presente recebido" : "Recebimento cancelado",
        description: newValue
          ? `"${item.gift_name}" marcado como recebido`
          : `"${item.gift_name}" não está mais marcado como recebido`,
      });
      fetchData();
    }
  };

  const handleUpdate = async () => {
    if (!permissions.canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para editar itens", variant: "destructive" });
      return;
    }

    if (!editItem.gift_name.trim()) {
      toast({ title: "Erro", description: "Nome do presente é obrigatório", variant: "destructive" });
      return;
    }

    const oldItem = items.find(item => item.id === editingId);
    const guestId = editItem.selected_by_guest_id || null;
    const { error } = await supabase
      .from("gift_items")
      .update({
        gift_name: editItem.gift_name.trim(),
        description: editItem.description.trim() || null,
        link: editItem.link.trim() || null,
        is_public: editItem.is_public,
        selected_by_guest_id: guestId,
        claimed_at: guestId ? new Date().toISOString() : null,
        claimed_via_admin: guestId ? true : false,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({ action: "update", tableName: "gift_items", recordId: editingId!, oldData: oldItem, newData: editItem, affectedName: editItem.gift_name });
      toast({ title: "Sucesso", description: "Presente atualizado!" });
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
    const deletedItem = items.find(item => item.id === id);
    const { error } = await supabase.from("gift_items").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({ action: "delete", tableName: "gift_items", recordId: id, oldData: deletedItem, affectedName: deletedItem?.gift_name });
      toast({ title: "Sucesso", description: "Presente removido!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, newValue: boolean) => {
    if (!permissions.canPublish) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para tornar itens públicos/privados", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("gift_items").update({ is_public: newValue }).eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Atualizado", description: `Presente ${newValue ? 'visível' : 'oculto'} para o público` });
      const gift = items.find(i => i.id === id);
      await logAdminAction({ action: "update", tableName: "gift_items", recordId: id, newData: { is_public: newValue }, affectedName: gift?.gift_name });
      fetchData();
    }
  };

  const handleToggleGiftsSection = async (newValue: boolean) => {
    if (!permissions.canPublish) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para publicar/ocultar seções", variant: "destructive" });
      return;
    }
    if (!weddingId) return;

    const { error } = await supabase.from("wedding_details").update({ show_gifts_section: newValue }).eq("id", weddingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Atualizado", description: `Seção de presentes ${newValue ? 'exibida' : 'oculta'} na página inicial` });
      await logAdminAction({ action: "update", tableName: "wedding_details", recordId: weddingId, newData: { show_gifts_section: newValue }, affectedName: "Seção Presentes" });
      setShowGiftsSection(newValue);
    }
  };

  const handleToggleHideReserved = async (newValue: boolean) => {
    if (!permissions.canPublish) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para publicar/ocultar seções", variant: "destructive" });
      return;
    }
    if (!weddingId) return;

    const { error } = await supabase.from("wedding_details").update({ hide_reserved_gifts: newValue }).eq("id", weddingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Atualizado", description: `Presentes reservados ${newValue ? 'ocultos' : 'visíveis'} na página inicial` });
      await logAdminAction({ action: "update", tableName: "wedding_details", recordId: weddingId, newData: { hide_reserved_gifts: newValue }, affectedName: "Ocultar Reservados" });
      setHideReservedGifts(newValue);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade da Seção de Presentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Exibir seção "Lista de Presentes" na página inicial</p>
              <p className="text-sm text-muted-foreground">Controla se toda a seção de presentes aparece na página inicial</p>
            </div>
            <Switch checked={showGiftsSection} onCheckedChange={handleToggleGiftsSection} disabled={!permissions.canPublish} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Ocultar presentes já reservados na página inicial</p>
              <p className="text-sm text-muted-foreground">Presentes que já foram escolhidos por convidados não serão exibidos</p>
            </div>
            <Switch checked={hideReservedGifts} onCheckedChange={handleToggleHideReserved} disabled={!permissions.canPublish} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Presente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome do Presente</Label>
            <Input placeholder="Ex: Jogo de panelas" value={newItem.gift_name} onChange={(e) => setNewItem({ ...newItem, gift_name: e.target.value })} disabled={!permissions.canAdd} />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input placeholder="Ex: Jogo com 5 peças antiaderente" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} disabled={!permissions.canAdd} />
          </div>
          <div>
            <Label>Link (opcional)</Label>
            <Input placeholder="https://exemplo.com/produto" value={newItem.link} onChange={(e) => setNewItem({ ...newItem, link: e.target.value })} disabled={!permissions.canAdd} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={newItem.is_public} onCheckedChange={(checked) => setNewItem({ ...newItem, is_public: checked })} disabled={!permissions.canPublish} />
            <Label>Exibir publicamente</Label>
          </div>
          <Button onClick={handleAdd} disabled={!newItem.gift_name || !permissions.canAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Presente</DialogTitle>
          </DialogHeader>
          {(() => {
            const currentItem = items.find(i => i.id === editingId);
            const isReceived = currentItem?.is_purchased === true;
            return (
              <div className="space-y-4">
                {isReceived && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Este presente já foi marcado como recebido. Para editar ou excluir, primeiro reverta o status de recebimento.
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label>Nome do Presente</Label>
                  <Input value={editItem.gift_name} onChange={(e) => setEditItem({ ...editItem, gift_name: e.target.value })} disabled={!permissions.canEdit || isReceived} />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} disabled={!permissions.canEdit || isReceived} />
                </div>
                <div>
                  <Label>Link (opcional)</Label>
                  <Input value={editItem.link} onChange={(e) => setEditItem({ ...editItem, link: e.target.value })} disabled={!permissions.canEdit || isReceived} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editItem.is_public} onCheckedChange={(checked) => setEditItem({ ...editItem, is_public: checked })} disabled={!permissions.canPublish || isReceived} />
                  <Label>Exibir publicamente</Label>
                </div>
                <div>
                  <Label>Vincular a convidado (opcional)</Label>
                  <Select
                    value={editItem.selected_by_guest_id || "none"}
                    onValueChange={(val) => setEditItem({ ...editItem, selected_by_guest_id: val === "none" ? "" : val })}
                    disabled={isReceived}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum convidado vinculado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {invitations.map((inv) => {
                        const statusLabel = inv.status === "confirmed" ? "Confirmado" : inv.status === "declined" ? "Recusado" : "Pendente";
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.guest_name} ({statusLabel})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {/* Received toggle button */}
                {currentItem?.selected_by_guest_id && permissions.canEdit && (
                  <Button
                    variant={isReceived ? "destructive" : "default"}
                    className="w-full"
                    onClick={() => handleToggleReceived(currentItem)}
                  >
                    <PackageCheck className="w-4 h-4 mr-2" />
                    {isReceived ? "Não recebido" : "Recebido"}
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} disabled={!editItem.gift_name || !permissions.canEdit || isReceived}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button onClick={() => setIsEditOpen(false)} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Presentes</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum presente adicionado.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const isReceived = item.is_purchased === true;
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.gift_name}</p>
                        {isReceived && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            <PackageCheck className="w-3 h-3 mr-1" />
                            Recebido
                          </Badge>
                        )}
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Ver link</a>
                      )}
                      {item.guest?.name && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">🎁 Selecionado por: {item.guest.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={item.is_public} onCheckedChange={(checked) => handleTogglePublic(item.id, checked)} disabled={!permissions.canPublish} />
                      <Button variant="outline" size="icon" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(item.id)} disabled={!permissions.canDelete || isReceived} title={isReceived ? "Reverta o recebimento antes de excluir" : undefined}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GiftManager;