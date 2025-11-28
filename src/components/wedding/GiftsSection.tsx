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
  selected_by_invitation_id: string | null;
}

const GiftsSection = ({ weddingId }: GiftsSectionProps) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSection, setShowSection] = useState(true);

  useEffect(() => {
    if (!weddingId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch wedding details to check if gifts section should be shown
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("show_gifts_section")
        .eq("id", weddingId)
        .single();

      if (weddingData) {
        setShowSection(weddingData.show_gifts_section ?? true);
      }

      // Fetch only public gifts
      const { data, error } = await supabase
        .from("gift_items")
        .select(`
          *,
          invitation:invitations(guest_name)
        `)
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

    fetchData();

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
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wedding_details",
          filter: `id=eq.${weddingId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weddingId]);

  if (!showSection) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {loading ? (
          <>
            <div className="text-center mb-12">
              <div className="h-12 w-64 mx-auto bg-muted/50 rounded-lg animate-pulse mb-4" />
              <div className="h-5 w-96 max-w-full mx-auto bg-muted/50 rounded animate-pulse" />
            </div>

            <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-card rounded-lg shadow-soft p-6 space-y-4 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-5 h-5 bg-muted/50 rounded animate-pulse" />
                      <div className="h-5 w-32 bg-muted/50 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-full bg-muted/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-12">
              <h2 className="text-5xl font-serif font-bold mb-4 text-foreground">
                Lista de Presentes
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {gifts.length === 0 
                  ? "Ainda não há presentes cadastrados"
                  : "Se você deseja nos presentear, aqui estão algumas sugestões especiais"
                }
              </p>
            </div>

            {gifts.length > 0 && (
              <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gifts.map((gift, index) => (
                  <Card
                    key={gift.id}
                    className={`shadow-soft hover:shadow-elegant transition-all duration-300 animate-fade-in ${
                      gift.is_purchased ? "opacity-60" : ""
                    }`}
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
                            ✓ Adquirido
                          </Badge>
                        )}
                      </div>
                      {gift.description && (
                        <CardDescription className="mt-2">
                          {gift.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    {gift.link && (
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
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default GiftsSection;
