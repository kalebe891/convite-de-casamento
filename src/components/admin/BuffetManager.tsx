import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { buffetItemSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";

const BuffetManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ item_name: "", category: "", is_public: true });

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
      const { data: itemsData } = await supabase
        .from("buffet_items")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("display_order");
      setItems(itemsData || []);
    }
  };

  const handleAdd = async () => {
    if (!weddingId) return;

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

    const { error } = await supabase.from("buffet_items").insert({
      wedding_id: weddingId,
      item_name: validationResult.data.item_name.trim(),
      category: validationResult.data.category?.trim() || null,
      is_public: newItem.is_public,
      display_order: items.length,
    });

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Item adicionado!" });
      setNewItem({ item_name: "", category: "", is_public: true });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("buffet_items").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
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
          <CardTitle>Adicionar Item ao Buffet</CardTitle>
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
          <Button onClick={handleAdd} disabled={!newItem.item_name}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
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
