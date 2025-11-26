import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";

const GiftManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [showGiftsSection, setShowGiftsSection] = useState<boolean>(true);
  const [newItem, setNewItem] = useState({ 
    gift_name: "", 
    description: "", 
    link: "",
    is_public: true 
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id, show_gifts_section")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      setShowGiftsSection(wedding.show_gifts_section ?? true);
      const { data: itemsData } = await supabase
        .from("gift_items")
        .select(`
          *,
          invitation:invitations(guest_name)
        `)
        .eq("wedding_id", wedding.id)
        .order("display_order");
      setItems(itemsData || []);
    }
  };

  const handleSave = async () => {
    if (!weddingId || !newItem.gift_name.trim()) {
      toast({ title: "Erro", description: "Nome do presente é obrigatório", variant: "destructive" });
      return;
    }

    if (editingId) {
      // Update existing gift
      const oldItem = items.find(item => item.id === editingId);
      const { error } = await supabase
        .from("gift_items")
        .update({
          gift_name: newItem.gift_name.trim(),
          description: newItem.description.trim() || null,
          link: newItem.link.trim() || null,
          is_public: newItem.is_public,
        })
        .eq("id", editingId);

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "update",
          tableName: "gift_items",
          recordId: editingId,
          oldData: oldItem,
          newData: newItem,
        });
        toast({ title: "Sucesso", description: "Presente atualizado!" });
        setNewItem({ gift_name: "", description: "", link: "", is_public: true });
        setEditingId(null);
        fetchData();
      }
    } else {
      // Insert new gift
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
        await logAdminAction({
          action: "insert",
          tableName: "gift_items",
          recordId: data?.id,
          newData: newItem,
        });
        toast({ title: "Sucesso", description: "Presente adicionado!" });
        setNewItem({ gift_name: "", description: "", link: "", is_public: true });
        fetchData();
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNewItem({
      gift_name: item.gift_name,
      description: item.description || "",
      link: item.link || "",
      is_public: item.is_public,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewItem({ gift_name: "", description: "", link: "", is_public: true });
  };

  const handleDelete = async (id: string) => {
    const deletedItem = items.find(item => item.id === id);
    const { error } = await supabase.from("gift_items").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({
        action: "delete",
        tableName: "gift_items",
        recordId: id,
        oldData: deletedItem,
      });
      toast({ title: "Sucesso", description: "Presente removido!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, newValue: boolean) => {
    const { error } = await supabase
      .from("gift_items")
      .update({ is_public: newValue })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ 
        title: "Atualizado", 
        description: `Presente ${newValue ? 'visível' : 'oculto'} para o público`,
      });
      
      await logAdminAction({
        action: "update",
        tableName: "gift_items",
        recordId: id,
        newData: { is_public: newValue },
      });
      
      fetchData();
    }
  };

  const handleToggleGiftsSection = async (newValue: boolean) => {
    if (!weddingId) return;

    const { error } = await supabase
      .from("wedding_details")
      .update({ show_gifts_section: newValue })
      .eq("id", weddingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ 
        title: "Atualizado", 
        description: `Seção de presentes ${newValue ? 'exibida' : 'oculta'} na página inicial`,
      });
      
      await logAdminAction({
        action: "update",
        tableName: "wedding_details",
        recordId: weddingId,
        newData: { show_gifts_section: newValue },
      });
      
      setShowGiftsSection(newValue);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade da Seção de Presentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Exibir seção "Lista de Presentes" na página inicial</p>
              <p className="text-sm text-muted-foreground">
                Controla se toda a seção de presentes aparece na página inicial
              </p>
            </div>
            <Switch
              checked={showGiftsSection}
              onCheckedChange={handleToggleGiftsSection}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Presente" : "Adicionar Presente"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome do Presente</Label>
            <Input
              placeholder="Ex: Jogo de panelas"
              value={newItem.gift_name}
              onChange={(e) => setNewItem({ ...newItem, gift_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex: Jogo com 5 peças antiaderente"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Link (opcional)</Label>
            <Input
              placeholder="https://exemplo.com/produto"
              value={newItem.link}
              onChange={(e) => setNewItem({ ...newItem, link: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newItem.is_public}
              onCheckedChange={(checked) => setNewItem({ ...newItem, is_public: checked })}
            />
            <Label>Exibir publicamente</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!newItem.gift_name}>
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
          <CardTitle>Lista de Presentes</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum presente adicionado.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{item.gift_name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.link && (
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Ver link
                      </a>
                    )}
                    {item.invitation?.guest_name && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                        🎁 Selecionado por: {item.invitation.guest_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_public}
                      onCheckedChange={(checked) => handleTogglePublic(item.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
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

export default GiftManager;
