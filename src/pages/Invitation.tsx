import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";
import HeroSection from "@/components/wedding/HeroSection";
import EventsSection from "@/components/wedding/EventsSection";

const Invitation = () => {
  const { code } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [weddingDetails, setWeddingDetails] = useState<any>(null);
  const [events, setEvents] = useState([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [selectedGiftId, setSelectedGiftId] = useState<string>("");
  const [giftSelecting, setGiftSelecting] = useState(false);
  const [formData, setFormData] = useState({
    attending: "",
    plusOne: false,
    dietaryRestrictions: "",
    message: "",
  });

  const fetchGiftItems = async (weddingId: string, invitationId: string) => {
    const { data: giftsData } = await supabase
      .from("gift_items")
      .select("*")
      .eq("wedding_id", weddingId)
      .or(`selected_by_invitation_id.is.null,selected_by_invitation_id.eq.${invitationId}`)
      .order("display_order");
    
    console.log("🎁 Buscando presentes:", { weddingId, invitationId, giftsData });
    setGifts(giftsData || []);
  };

  useEffect(() => {
    const fetchInvitation = async () => {
      console.log("🔎 Iniciando fetch de convite:", code);
      if (!code) return;

      try {
        // Usar Edge Function segura para buscar convite
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rsvp-view`);
        url.searchParams.set('token', code);

        const response = await fetch(url.toString(), {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Convite não encontrado');
        }

        const invitationData = await response.json();
        setInvitation(invitationData);

        // Buscar detalhes do casamento (ainda precisa de acesso direto)
        if (invitationData.wedding_id) {
          const { data: weddingData } = await supabase
            .from("wedding_details")
            .select("*")
            .eq("id", invitationData.wedding_id)
            .single();

          setWeddingDetails(weddingData);

          const { data: eventsData } = await supabase
            .from("events")
            .select("*")
            .eq("wedding_id", invitationData.wedding_id)
            .order("event_date");

          setEvents(eventsData || []);

          // Buscar presentes disponíveis
          await fetchGiftItems(invitationData.wedding_id, invitationData.id);
        }

        if (invitationData.attending !== null) {
          setFormData({
            attending: invitationData.attending ? "yes" : "no",
            plusOne: invitationData.plus_one || false,
            dietaryRestrictions: invitationData.dietary_restrictions || "",
            message: invitationData.message || "",
          });
        }

        // Verificar se já selecionou um presente
        const { data: selectedGift } = await supabase
          .from("gift_items")
          .select("id")
          .eq("selected_by_invitation_id", invitationData.id)
          .maybeSingle();

        if (selectedGift) {
          setSelectedGiftId(selectedGift.id);
        }
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Convite não encontrado.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [code, toast]);

  const handleGiftSelect = async (giftId: string) => {
    if (!invitation) return;
    
    setGiftSelecting(true);
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
            invitation_id: invitation.id,
            gift_id: giftId || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao selecionar presente');
      }

      setSelectedGiftId(giftId);
      
      if (data.cleared) {
        toast({
          title: "Presente desmarcado",
          description: "Você pode escolher outro presente.",
        });
      } else {
      toast({
        title: "🎁 Presente reservado!",
        description: `${data.gift_name} foi reservado por você.`,
      });
    }

    // Atualizar lista de presentes
    await fetchGiftItems(invitation.wedding_id, invitation.id);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível selecionar o presente.",
        variant: "destructive",
      });
    } finally {
      setGiftSelecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Usar Edge Function segura para enviar resposta
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rsvp-respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            token: code,
            attending: formData.attending === "yes",
            plus_one: formData.plusOne,
            dietary_restrictions: formData.dietaryRestrictions,
            message: formData.message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao enviar confirmação');
      }

      toast({
        title: "Confirmação enviada!",
        description: "Obrigado por confirmar sua presença.",
      });
      
      // Atualizar estado local
      setInvitation({ ...invitation, responded_at: new Date().toISOString() });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a confirmação.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Convite não encontrado</CardTitle>
            <CardDescription>
              O link do convite parece estar incorreto.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroSection weddingDetails={weddingDetails} />
      <EventsSection events={events} />

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto shadow-elegant">
            <CardHeader className="text-center">
              <Heart className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle className="text-3xl font-serif">
                Olá, {invitation.guest_name}!
              </CardTitle>
              <CardDescription className="text-lg">
                Confirme sua presença em nosso casamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base">Você confirmará presença?</Label>
                  <RadioGroup
                    value={formData.attending}
                    onValueChange={(value) =>
                      setFormData({ ...formData, attending: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" />
                      <Label htmlFor="yes" className="font-normal cursor-pointer">
                        Sim, estarei presente! 🎉
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" />
                      <Label htmlFor="no" className="font-normal cursor-pointer">
                        Infelizmente não poderei comparecer
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.attending === "yes" && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="plusOne"
                        checked={formData.plusOne}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, plusOne: checked as boolean })
                        }
                      />
                      <Label htmlFor="plusOne" className="font-normal cursor-pointer">
                        Vou levar um acompanhante
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dietary">Restrições Alimentares</Label>
                      <Input
                        id="dietary"
                        value={formData.dietaryRestrictions}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dietaryRestrictions: e.target.value,
                          })
                        }
                        placeholder="Ex: vegetariano, intolerância à lactose..."
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem para os noivos (opcional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={4}
                    placeholder="Deixe uma mensagem especial..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!formData.attending || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Confirmar Presença"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="max-w-2xl mx-auto shadow-elegant mt-8">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-serif">
                🎁 Lista de Presentes
              </CardTitle>
              <CardDescription>
                Escolha um presente para os noivos (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedGiftId && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm font-medium text-primary">
                      🎁 Presente reservado por você!
                    </p>
                  </div>
                )}
                {gifts.length > 0 ? (
                  <RadioGroup
                    value={selectedGiftId}
                    onValueChange={handleGiftSelect}
                    disabled={giftSelecting}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="" id="no-gift" disabled={giftSelecting} />
                      <Label htmlFor="no-gift" className="font-normal cursor-pointer">
                        {selectedGiftId ? "Desmarcar presente" : "Não selecionar presente"}
                      </Label>
                    </div>
                    {gifts.map((gift) => (
                      <div key={gift.id} className="flex items-start space-x-2">
                        <RadioGroupItem value={gift.id} id={`gift-${gift.id}`} disabled={giftSelecting} />
                        <Label
                          htmlFor={`gift-${gift.id}`}
                          className="font-normal cursor-pointer flex-1"
                        >
                          <div>
                            <p className="font-medium">{gift.gift_name}</p>
                            {gift.description && (
                              <p className="text-sm text-muted-foreground">
                                {gift.description}
                              </p>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : selectedGiftId ? (
                  <p className="text-sm text-muted-foreground">
                    Você já selecionou um presente para os noivos.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Todos os presentes já foram selecionados por outros convidados.
                  </p>
                )}
                {giftSelecting && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando seleção...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Invitation;
