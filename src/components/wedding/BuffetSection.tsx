import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";

interface BuffetItem {
  id: string;
  item_name: string;
  category: string | null;
  is_public: boolean;
  display_order: number;
}

interface BuffetSectionProps {
  weddingId: string | null;
}

const BuffetSection = ({ weddingId }: BuffetSectionProps) => {
  const [items, setItems] = useState<BuffetItem[]>([]);

  useEffect(() => {
    if (!weddingId) return;

    const fetchBuffetItems = async () => {
      const { data } = await supabase
        .from("buffet_items")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("display_order");

      setItems(data || []);
    };

    fetchBuffetItems();
  }, [weddingId]);

  if (!weddingId || items.length === 0) return null;

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Outros";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BuffetItem[]>);

  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-4xl font-serif font-bold mb-2">Cardápio</h2>
          <p className="text-muted-foreground">Delícias que preparamos para você</p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card key={category} className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {categoryItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <span>{item.item_name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BuffetSection;
