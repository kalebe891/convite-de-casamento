import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface InvitationGiftsProps {
  weddingId: string | null;
  invitationId: string | null;
}

interface GiftItem {
  id: string;
  gift_name: string;
  description: string | null;
  link: string | null;
  selected_by_invitation_id: string | null;
}

const InvitationGifts = ({ weddingId, invitationId }: InvitationGiftsProps) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<string>("");
  const [selecting, setSelecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!weddingId || !invitationId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch all gifts without is_public filter
      const { data, error } = await supabase
        .from("gift_items")
        .select("*")
        .eq("wedding_id", weddingId)
        .or(`selected_by_invitation_id.is.null,selected_by_invitation_id.eq.${invitationId}`)
        .order("display_order");

      if (error) {
        console.error("Error fetching gifts:", error);
      } else {
        setGifts(data || []);
        
        // Set the already selected gift if any
        const alreadySelected = data?.find(g => g.selected_by_invitation_id === invitationId);
        if (alreadySelected) {
          setSelectedGift(alreadySelected.id);
        }
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("invitation-gifts")
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weddingId, invitationId]);

  const handleGiftSelection = async (giftId: string) => {
    if (!invitationId || selecting) return;

    // If clicking the same gift, unselect it
    const newGiftId = giftId === selectedGift ? null : giftId;
    
    setSelecting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/select-gift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            invitation_id: invitationId,
            gift_id: newGiftId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao selecionar presente');
      }

      const result = await response.json();

      if (result.cleared) {
        setSelectedGift("");
        toast({
          title: "Presente desmarcado",
          description: "Você pode escolher outro presente se desejar.",
        });
      } else {
        setSelectedGift(giftId);
        toast({
          title: "🎁 Presente reservado!",
          description: `${result.gift_name} foi reservado por você.`,
        });
      }
    } catch (error) {
      console.error('[InvitationGifts] Erro ao selecionar presente:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao selecionar presente",
        variant: "destructive",
      });
    } finally {
      setSelecting(false);
    }
  };

  if (!weddingId || !invitationId) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto shadow-elegant">
          <CardHeader>
            <CardTitle className="text-3xl font-serif text-center flex items-center justify-center gap-2">
              <Gift className="w-8 h-8 text-primary" />
              Lista de Presentes
            </CardTitle>
            <CardDescription className="text-center text-lg">
              {loading 
                ? "Carregando presentes..." 
                : gifts.length === 0 
                  ? "Ainda não há presentes cadastrados"
                  : "Escolha um presente especial para os noivos (opcional)"
              }
            </CardDescription>
          </CardHeader>
          
          {!loading && gifts.length > 0 && (
            <CardContent>
              <RadioGroup value={selectedGift} onValueChange={handleGiftSelection}>
                <div className="space-y-3">
                  {gifts.map((gift) => {
                    const isSelectedByOther = gift.selected_by_invitation_id && gift.selected_by_invitation_id !== invitationId;
                    const isSelectedByMe = gift.selected_by_invitation_id === invitationId;

                    return (
                      <div
                        key={gift.id}
                        className={`flex items-start space-x-3 rounded-lg border p-4 transition-all ${
                          isSelectedByOther
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : isSelectedByMe
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50 cursor-pointer"
                        }`}
                      >
                        <RadioGroupItem 
                          value={gift.id} 
                          id={gift.id}
                          disabled={isSelectedByOther || selecting}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={gift.id}
                            className={`font-medium flex items-center gap-2 ${
                              isSelectedByOther ? "cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            {gift.gift_name}
                            {isSelectedByOther && (
                              <Badge variant="secondary" className="text-xs">
                                Selecionado
                              </Badge>
                            )}
                            {isSelectedByMe && (
                              <Badge variant="default" className="text-xs">
                                🎁 Reservado por você
                              </Badge>
                            )}
                          </Label>
                          {gift.description && (
                            <p className="text-sm text-muted-foreground">
                              {gift.description}
                            </p>
                          )}
                          {gift.link && !isSelectedByOther && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-primary"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(gift.link!, "_blank");
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ver detalhes
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
              
              <p className="text-sm text-muted-foreground text-center mt-4">
                {selectedGift 
                  ? "Você pode alterar ou desmarcar sua escolha clicando novamente no presente selecionado."
                  : "Selecione um presente para reservá-lo instantaneamente."
                }
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </section>
  );
};

export default InvitationGifts;
