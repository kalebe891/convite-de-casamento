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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!weddingId) {
      setIsLoading(false);
      return;
    }

    const fetchBuffetItems = async () => {
      const { data } = await supabase
        .from("buffet_items")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("display_order");

      setItems(data || []);
      setIsLoading(false);
    };

    fetchBuffetItems();
  }, [weddingId]);

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-12 h-12 mx-auto mb-4 bg-muted/50 rounded-full animate-pulse" />
            <div className="h-10 w-48 mx-auto bg-muted/50 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 mx-auto bg-muted/50 rounded animate-pulse" />
          </div>

          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-card rounded-lg shadow-elegant p-6 animate-fade-in">
                <div className="h-7 w-32 bg-muted/50 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted/50 flex-shrink-0" />
                      <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

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
