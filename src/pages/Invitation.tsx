import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, HeartOff, Loader2, Gift, ExternalLink } from "lucide-react";
import { z } from "zod";
import HeroSection from "@/components/wedding/HeroSection";
import EventsSection from "@/components/wedding/EventsSection";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

const rsvpResponseSchema = z.object({
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

interface InvitationData {
  id: string;
  guest_name: string;
  attending: boolean | null;
  responded_at: string | null;
  plus_one: boolean | null;
  dietary_restrictions: string | null;
  message: string | null;
  wedding_id: string | null;
  selected_gift_id?: string | null;
}

interface GiftItem {
  id: string;
  gift_name: string;
  description: string | null;
  link: string | null;
  selected_by_invitation_id: string | null;
}

const Invitation = () => {
  const { invitation_code } = useParams<{ invitation_code?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [weddingDetails, setWeddingDetails] = useState(null);
  const [events, setEvents] = useState([]);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    message: "",
  });
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingGift, setSavingGift] = useState(false);
  const [hasExistingGift, setHasExistingGift] = useState(false);

  // Fetch wedding data
  useEffect(() => {
    const fetchWeddingData = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("*")
        .single();

      if (weddingData) {
        setWeddingDetails(weddingData);

        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("wedding_id", weddingData.id)
          .order("event_date");

        setEvents(eventsData || []);
      }
    };

    fetchWeddingData();
  }, []);

  // Fetch invitation data
  useEffect(() => {
    const fetchInvitationData = async () => {
      if (!invitation_code) return;

      setLoadingInvitation(true);
      setInvitationError(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rsvp-view?token=${encodeURIComponent(invitation_code)}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Convite não encontrado');
        }

        const data: InvitationData = await response.json();
        setInvitationData(data);

        // Pre-fill form with existing data if available
        if (data.message) {
          setFormData({
            message: data.message || "",
          });
        }
      } catch (error) {
        console.error('[Invitation] Erro ao buscar convite:', error);
        setInvitationError(error instanceof Error ? error.message : 'Erro ao buscar convite');
      } finally {
        setLoadingInvitation(false);
      }
    };

    fetchInvitationData();
  }, [invitation_code]);

  // Fetch gifts
  useEffect(() => {
    if (!weddingDetails?.id || !invitationData?.id) {
      setLoadingGifts(false);
      return;
    }

    const fetchGifts = async () => {
      setLoadingGifts(true);
      const { data, error } = await supabase
        .from("gift_items")
        .select("*")
        .eq("wedding_id", weddingDetails.id)
        .or(`selected_by_invitation_id.is.null,selected_by_invitation_id.eq.${invitationData.id}`)
        .order("display_order");

      if (error) {
        console.error("Error fetching gifts:", error);
      } else {
        setGifts(data || []);
        
        // Set already selected gift
        const alreadySelected = data?.find(g => g.selected_by_invitation_id === invitationData.id);
        if (alreadySelected) {
          setSelectedGiftId(alreadySelected.id);
          setHasExistingGift(true);
        } else {
          setHasExistingGift(false);
        }
      }
      setLoadingGifts(false);
    };

    fetchGifts();
  }, [weddingDetails?.id, invitationData?.id]);

  const handleRSVPResponse = async (attending: boolean) => {
    if (!invitation_code || !invitationData) return;

    try {
      const validatedData = rsvpResponseSchema.parse(formData);
      setSubmitting(true);

      // First, respond to RSVP
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rsvp-respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            token: invitation_code,
            attending,
            message: validatedData.message || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar resposta');
      }

      // Then, save gift selection if attending and gift selected
      if (attending && selectedGiftId) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/select-gift`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              invitation_id: invitationData.id,
              gift_id: selectedGiftId,
            }),
          }
        );
      }

      // Update local state to show final status
      setInvitationData({
        ...invitationData,
        attending,
        responded_at: new Date().toISOString(),
        message: validatedData.message || null,
      });

      toast({
        title: attending ? "Presença confirmada!" : "Resposta registrada",
        description: attending 
          ? "Obrigado por confirmar! Mal podemos esperar para celebrar com você!"
          : "Sentiremos sua falta 💔",
      });
    } catch (error) {
      console.error('[Invitation] Erro ao responder RSVP:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro ao processar resposta",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGiftChange = async () => {
    if (!invitationData || !invitationData.responded_at) return;

    try {
      setSavingGift(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/select-gift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            invitation_id: invitationData.id,
            gift_id: selectedGiftId || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        // Verificar se é erro 403 (já tem presente)
        if (response.status === 403) {
          toast({
            title: "Alteração não permitida",
            description: errorData.error || "Você já selecionou um presente. Para alterar, solicite um novo link.",
            variant: "destructive",
          });
          setDrawerOpen(false);
          return;
        }
        
        throw new Error(errorData.error || 'Erro ao salvar presente');
      }

      toast({
        title: "Presente atualizado!",
        description: selectedGiftId 
          ? "Sua escolha de presente foi alterada com sucesso"
          : "Seleção de presente removida",
      });

      setDrawerOpen(false);
    } catch (error) {
      console.error('[Invitation] Erro ao salvar presente:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar presente",
        variant: "destructive",
      });
    } finally {
      setSavingGift(false);
    }
  };

  const renderRSVPSection = () => {
    if (!invitation_code) return null;

    if (loadingInvitation) {
      return (
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto shadow-elegant">
              <CardContent className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Carregando convite...</p>
              </CardContent>
            </Card>
          </div>
        </section>
      );
    }

    if (invitationError || !invitationData) {
      return (
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto shadow-elegant border-destructive">
              <CardHeader>
                <CardTitle className="text-3xl font-serif text-center text-destructive">
                  Convite Inválido
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {invitationError || "Não foi possível encontrar este convite."}
                </p>
                <Button onClick={() => navigate("/")} variant="outline">
                  Voltar para página inicial
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      );
    }

    // Show final status if already responded
    if (invitationData.responded_at) {
      return (
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto shadow-elegant border-primary">
              <CardHeader>
                <CardTitle className="text-3xl font-serif text-center flex items-center justify-center gap-2">
                  {invitationData.attending ? (
                    <>
                      <Heart className="w-8 h-8 text-primary" />
                      Obrigado, {invitationData.guest_name}!
                    </>
                  ) : (
                    <>
                      <HeartOff className="w-8 h-8 text-muted-foreground" />
                      Sentiremos sua falta
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-center text-lg">
                  {invitationData.attending 
                    ? "Sua presença está confirmada! Mal podemos esperar para celebrar com você!"
                    : "Obrigado por nos informar. Esperamos vê-lo em outra ocasião! 💔"
                  }
                </CardDescription>
              </CardHeader>
              {invitationData.message && (
                <CardContent className="space-y-4 border-t pt-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Mensagem:</p>
                    <p className="text-foreground">{invitationData.message}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </section>
      );
    }

    // Show RSVP form if not yet responded
    return (
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
            Confirmação de Presença
          </h2>
          
          <Card className="max-w-2xl mx-auto shadow-elegant animate-fade-in">
            <CardHeader>
              <CardTitle className="text-3xl font-serif text-center">
                Olá, {invitationData.guest_name}! 👋
              </CardTitle>
              <CardDescription className="text-center text-lg">
                Você vem ao nosso casamento?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="message">Gostaria de deixar uma mensagem para os noivos? (opcional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Deixe uma mensagem carinhosa..."
                  maxLength={1000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.message.length}/1000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button 
                  onClick={() => handleRSVPResponse(true)}
                  disabled={submitting}
                  size="lg"
                  className="text-lg py-6"
                >
                  {submitting ? "Enviando..." : "✓ Sim, estarei presente!"}
                </Button>
                <Button 
                  onClick={() => handleRSVPResponse(false)}
                  disabled={submitting}
                  variant="outline"
                  size="lg"
                  className="text-lg py-6"
                >
                  {submitting ? "Enviando..." : "✗ Não poderei ir"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-serif font-bold text-primary">
            {weddingDetails ? `${weddingDetails.bride_name} & ${weddingDetails.groom_name}` : "Nosso Casamento"}
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-20">
        <HeroSection weddingDetails={weddingDetails} />
        {renderRSVPSection()}
        <EventsSection events={events} />
      </main>

      <footer className="bg-card border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Convite de Casamento. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Drawer inferior para lista de presentes */}
      {invitation_code && invitationData && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 rounded-full shadow-lg px-6 py-6 text-lg z-50"
              size="lg"
            >
              <Gift className="w-5 h-5 mr-2" />
              Lista de Presentes
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle className="text-2xl font-serif flex items-center justify-center gap-2">
                <Gift className="w-6 h-6 text-primary" />
                Lista de Presentes
              </DrawerTitle>
              <DrawerDescription className="text-center">
                {loadingGifts 
                  ? "Carregando presentes..." 
                  : gifts.length === 0 
                    ? "Ainda não há presentes cadastrados"
                    : invitationData?.responded_at && hasExistingGift
                      ? "Você já selecionou um presente. Para alterar, solicite um novo link."
                      : invitationData?.responded_at
                        ? "Você pode alterar sua escolha de presente"
                        : "Escolha um presente especial para os noivos (opcional)"
                }
              </DrawerDescription>
            </DrawerHeader>
            
            {!loadingGifts && gifts.length > 0 && (
              <div className="px-4 overflow-y-auto max-h-[60vh]">
                {invitationData?.responded_at && hasExistingGift ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <Gift className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Você já selecionou um presente com este link.
                      <br />
                      Para alterar sua escolha, solicite um novo link aos noivos.
                    </p>
                  </div>
                ) : (
                  <RadioGroup value={selectedGiftId} onValueChange={setSelectedGiftId}>
                    <div className="space-y-3 pb-4">
                      {gifts.map((gift) => {
                        const isSelectedByOther = gift.selected_by_invitation_id && gift.selected_by_invitation_id !== invitationData?.id;
                        const isSelectedByMe = gift.selected_by_invitation_id === invitationData?.id;

                      return (
                        <div
                          key={gift.id}
                          className={`flex items-start space-x-3 rounded-lg border p-4 transition-all ${
                            isSelectedByOther
                              ? "opacity-50 cursor-not-allowed bg-muted"
                              : isSelectedByMe
                              ? "border-primary bg-primary/5"
                              : selectedGiftId === gift.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50 cursor-pointer"
                          }`}
                        >
                          <RadioGroupItem 
                            value={gift.id} 
                            id={gift.id}
                            disabled={isSelectedByOther}
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
                              {selectedGiftId === gift.id && !isSelectedByOther && (
                                <Badge variant="default" className="text-xs">
                                  Escolhido
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
                )}
              </div>
            )}

            <DrawerFooter>
              {invitationData?.responded_at && !hasExistingGift ? (
                <>
                  <Button 
                    onClick={handleSaveGiftChange} 
                    disabled={savingGift || loadingGifts}
                  >
                    {savingGift ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alteração"
                    )}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DrawerClose>
                </>
              ) : invitationData?.responded_at && hasExistingGift ? (
                <DrawerClose asChild>
                  <Button variant="outline">Fechar</Button>
                </DrawerClose>
              ) : (
                <>
                  <DrawerClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DrawerClose>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {selectedGiftId 
                      ? "Presente será registrado ao confirmar sua presença"
                      : "A escolha de presente é opcional"
                    }
                  </p>
                </>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default Invitation;
