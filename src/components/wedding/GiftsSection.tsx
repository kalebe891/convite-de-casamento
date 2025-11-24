import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GiftsSectionProps {
  weddingId: string | null;
}

interface GiftItem {
  id: string;
  gift_name: string;
  description: string | null;
  link: string | null;
  is_purchased: boolean | null;
  is_public: boolean | null;
}

const GiftsSection = ({ weddingId }: GiftsSectionProps) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weddingId) return;

    const fetchGifts = async () => {
      const { data, error } = await supabase
        .from("gift_items")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching gifts:", error);
      } else {
        setGifts(data || []);
      }
      setLoading(false);
    };

    fetchGifts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("public-gifts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gift_items",
          filter: `wedding_id=eq.${weddingId}`,
        },
        () => {
          fetchGifts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weddingId]);

  if (loading) return null;
  if (gifts.length === 0) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-serif font-bold mb-4 text-foreground">
            Lista de Presentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Se você deseja nos presentear, aqui estão algumas sugestões especiais
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gifts.map((gift, index) => (
            <Card
              key={gift.id}
              className="shadow-soft hover:shadow-elegant transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Gift className="w-5 h-5 text-primary flex-shrink-0" />
                    <CardTitle className="text-lg">{gift.gift_name}</CardTitle>
                  </div>
                  {gift.is_purchased && (
                    <Badge variant="secondary" className="ml-2">
                      Comprado
                    </Badge>
                  )}
                </div>
                {gift.description && (
                  <CardDescription className="mt-2">
                    {gift.description}
                  </CardDescription>
                )}
              </CardHeader>
              {gift.link && !gift.is_purchased && (
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(gift.link!, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Presente
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GiftsSection;
