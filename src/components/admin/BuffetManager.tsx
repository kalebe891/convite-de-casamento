import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { buffetItemSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";

interface BuffetManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const BuffetManager = ({ permissions }: BuffetManagerProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [showBuffetSection, setShowBuffetSection] = useState<boolean>(true);
  const [newItem, setNewItem] = useState({ item_name: "", category: "", is_public: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id, show_buffet_section")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      setShowBuffetSection(wedding.show_buffet_section ?? true);
      const { data: itemsData } = await supabase
        .from("buffet_items")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("display_order");
      setItems(itemsData || []);
    }
  };

  const handleToggleBuffetSection = async (checked: boolean) => {
    if (!permissions.canPublish) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para publicar/ocultar seções",
        variant: "destructive",
      });
      return;
    }

    if (!weddingId) return;

    try {
      const { error } = await supabase
        .from("wedding_details")
        .update({ show_buffet_section: checked })
        .eq("id", weddingId);

      if (error) throw error;

      setShowBuffetSection(checked);
      toast({
        title: "Configuração atualizada!",
        description: checked
          ? "Seção buffet agora está visível na página pública"
          : "Seção buffet foi ocultada da página pública",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!weddingId) return;

    if (!permissions.canAdd && !editingId) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para adicionar itens",
        variant: "destructive",
      });
      return;
    }

    if (!permissions.canEdit && editingId) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar itens",
        variant: "destructive",
      });
      return;
    }

    // Validate input data
    const validationResult = buffetItemSchema.safeParse({
      item_name: newItem.item_name,
      category: newItem.category
    });
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({ title: "Erro de validação", description: firstError.message, variant: "destructive" });
      return;
    }

    if (editingId) {
      // Update existing item
      const oldItem = items.find(item => item.id === editingId);
      const { error } = await supabase
        .from("buffet_items")
        .update({
          item_name: validationResult.data.item_name.trim(),
          category: validationResult.data.category?.trim() || null,
          is_public: newItem.is_public,
        })
        .eq("id", editingId);

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "update",
          tableName: "buffet_items",
          recordId: editingId,
          oldData: oldItem,
          newData: newItem,
        });
        toast({ title: "Sucesso", description: "Item atualizado!" });
        setNewItem({ item_name: "", category: "", is_public: true });
        setEditingId(null);
        fetchData();
      }
    } else {
      // Insert new item
      const { data, error } = await supabase.from("buffet_items").insert({
        wedding_id: weddingId,
        item_name: validationResult.data.item_name.trim(),
        category: validationResult.data.category?.trim() || null,
        is_public: newItem.is_public,
        display_order: items.length,
      }).select().single();

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "insert",
          tableName: "buffet_items",
          recordId: data?.id,
          newData: newItem,
        });
        toast({ title: "Sucesso", description: "Item adicionado!" });
        setNewItem({ item_name: "", category: "", is_public: true });
        fetchData();
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNewItem({
      item_name: item.item_name,
      category: item.category || "",
      is_public: item.is_public,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewItem({ item_name: "", category: "", is_public: true });
  };

  const handleDelete = async (id: string) => {
    const deletedItem = items.find(item => item.id === id);
    const { error } = await supabase.from("buffet_items").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({
        action: "delete",
        tableName: "buffet_items",
        recordId: id,
        oldData: deletedItem,
      });
      toast({ title: "Sucesso", description: "Item removido!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("buffet_items")
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
          <CardTitle>{editingId ? "Editar Item" : "Adicionar Item ao Buffet"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome do Item</Label>
            <Input
              placeholder="Ex: Arroz à grega"
              value={newItem.item_name}
              onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Categoria (opcional)</Label>
            <Input
              placeholder="Ex: Entrada, Prato principal, Sobremesa"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
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
            <Button onClick={handleSave} disabled={!newItem.item_name}>
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
          <CardTitle>Itens do Buffet</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum item adicionado.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{item.item_name}</p>
                    {item.category && (
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_public}
                      onCheckedChange={() => handleTogglePublic(item.id, item.is_public)}
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

export default BuffetManager;
