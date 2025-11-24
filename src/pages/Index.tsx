import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import HeroSection from "@/components/wedding/HeroSection";
import StorySection from "@/components/wedding/StorySection";
import EventsSection from "@/components/wedding/EventsSection";
import GallerySection from "@/components/wedding/GallerySection";
import TimelineSection from "@/components/wedding/TimelineSection";
import BuffetSection from "@/components/wedding/BuffetSection";
import PlaylistSection from "@/components/wedding/PlaylistSection";
import GiftsSection from "@/components/wedding/GiftsSection";
import ConfirmedGuestsSection from "@/components/wedding/ConfirmedGuestsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogIn, Heart, HeartOff } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

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
}

const Index = () => {
  const navigate = useNavigate();
  const { invitation_code } = useParams<{ invitation_code?: string }>();
  const { toast } = useToast();

  const [session, setSession] = useState(null);
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [events, setEvents] = useState([]);
  const [photos, setPhotos] = useState([]);

  // RSVP state
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    message: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

        const { data: photosData } = await supabase
          .from("photos")
          .select("*")
          .eq("wedding_id", weddingData.id)
          .order("display_order");

        setEvents(eventsData || []);
        setPhotos(photosData || []);
      }
    };

    fetchWeddingData();
  }, []);

  // Fetch invitation data if invitation_code is present
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
        console.error('[Index] Erro ao buscar convite:', error);
        setInvitationError(error instanceof Error ? error.message : 'Erro ao buscar convite');
      } finally {
        setLoadingInvitation(false);
      }
    };

    fetchInvitationData();
  }, [invitation_code]);

  const handleRSVPResponse = async (attending: boolean) => {
    if (!invitation_code || !invitationData) return;

    try {
      const validatedData = rsvpResponseSchema.parse(formData);
      setSubmitting(true);

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

      const result = await response.json();

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
      console.error('[Index] Erro ao responder RSVP:', error);
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

  // RSVP Section - only shown if invitation_code is present
  const renderRSVPSection = () => {
    if (!invitation_code) return null;

    if (loadingInvitation) {
      return (
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto shadow-elegant">
              <CardContent className="py-12 text-center">
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!invitation_code && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(session ? "/admin" : "/auth")}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                {session ? "Painel" : "Login Admin"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20">
        <HeroSection weddingDetails={weddingDetails} />
        <StorySection weddingDetails={weddingDetails} />
        {renderRSVPSection()}
        <EventsSection events={events} />
        <TimelineSection weddingId={weddingDetails?.id || null} />
        <BuffetSection weddingId={weddingDetails?.id || null} />
        <PlaylistSection weddingId={weddingDetails?.id || null} />
        <GiftsSection weddingId={weddingDetails?.id || null} />
        <ConfirmedGuestsSection weddingId={weddingDetails?.id || null} />
        <GallerySection photos={photos} />
      </main>

      <footer className="bg-card border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Convite de Casamento. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
