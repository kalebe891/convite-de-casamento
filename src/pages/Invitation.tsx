import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Heart, HeartOff, Loader2, Gift, ExternalLink, Copy, QrCode } from "lucide-react";
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
import PixQrViewerDialog, { type PixQrViewerData } from "@/components/shared/PixQrViewerDialog";
import { buildTenantPublicUrl } from "@/lib/eventType";

type PageStatus = "loading" | "success" | "error";

const rsvpResponseSchema = z.object({
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

interface InvitationData {
  id: string;
  guest_id: string;
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
  selected_by_guest_id: string | null;
  gift_kind?: string | null;
}

interface PixGiftItem {
  id: string;
  gift_name: string;
  description: string | null;
  suggested_amount: number | null;
  pix_copy_paste_code: string | null;
  qr_image_url: string | null;
}

const Invitation = () => {
  const { invitation_code } = useParams<{ invitation_code?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [weddingDetails, setWeddingDetails] = useState<any>(null);
  const [events, setEvents] = useState([]);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus>(invitation_code ? "loading" : "error");
  const [invitationError, setInvitationError] = useState<string | null>(
    invitation_code ? null : "Convite não encontrado ou expirado. Entre em contato com os anfitriões."
  );
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
  const [pixGifts, setPixGifts] = useState<PixGiftItem[]>([]);
  const [selectedPixIds, setSelectedPixIds] = useState<string[]>([]);
  const [confirmedPixDetails, setConfirmedPixDetails] = useState<PixGiftItem[]>([]);
  const [qrViewerOpen, setQrViewerOpen] = useState(false);
  const [qrViewerData, setQrViewerData] = useState<PixQrViewerData | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const REDIRECT_DELAY_MS = 7000;

  // Constrói a URL de redirecionamento a partir do tenant real (event_type + slug).
  // Reutiliza `buildTenantPublicUrl`, que já normaliza `event_type` do banco -> segmento de URL.
  // Fallback seguro: window.location.origin.
  const resolveRedirectUrl = (): string => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const tenantPath = buildTenantPublicUrl(weddingDetails);
    return tenantPath ? `${origin}${tenantPath}` : origin || "/";
  };

  const cancelRedirectTimer = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  const startRedirectTimer = () => {
    cancelRedirectTimer();
    const destination = resolveRedirectUrl();
    redirectTimerRef.current = setTimeout(() => {
      window.location.href = destination;
    }, REDIRECT_DELAY_MS);
  };

  useEffect(() => () => cancelRedirectTimer(), []);

  const openQrViewer = (pix: PixGiftItem) => {
    cancelRedirectTimer();
    setQrViewerData({
      gift_name: pix.gift_name,
      description: pix.description,
      qr_image_url: pix.qr_image_url,
      pix_copy_paste_code: pix.pix_copy_paste_code,
    });
    setQrViewerOpen(true);
  };

  const handleQrViewerOpenChange = (open: boolean) => {
    setQrViewerOpen(open);
    if (!open) {
      // Reinicia o timer apenas se o RSVP já foi confirmado
      if (invitationData?.responded_at && invitationData.attending) {
        startRedirectTimer();
      }
    } else {
      cancelRedirectTimer();
    }
  };

  const handleTogglePix = async (pix: PixGiftItem, checked: boolean) => {
    setSelectedPixIds((prev) =>
      checked ? [...prev, pix.id] : prev.filter((id) => id !== pix.id)
    );
    if (!checked) return;

    // Auto-copy + oferecer visualização do QR
    let copied = false;
    if (pix.pix_copy_paste_code) {
      try {
        await navigator.clipboard.writeText(pix.pix_copy_paste_code);
        copied = true;
      } catch {
        copied = false;
      }
    }
    sonnerToast(copied ? "QR Code PIX copiado." : "Não foi possível copiar automaticamente.", {
      description: pix.qr_image_url ? "Deseja visualizar o QR Code?" : undefined,
      action: pix.qr_image_url
        ? { label: "Ver QR Code", onClick: () => openQrViewer(pix) }
        : undefined,
    });
  };

  // Fetch wedding data once invitation is resolved (uses invitation.wedding_id)
  useEffect(() => {
    const fetchWeddingData = async () => {
      if (!invitationData?.wedding_id) return;

      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("*")
        .eq("id", invitationData.wedding_id)
        .maybeSingle();

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
  }, [invitationData?.wedding_id]);

  // Fetch invitation data
  useEffect(() => {
    const fetchInvitationData = async () => {
      if (!invitation_code) {
        setPageStatus("error");
        setInvitationError("Convite não encontrado ou expirado. Entre em contato com os anfitriões.");
        return;
      }

      setPageStatus("loading");
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
          throw new Error("invalid_token");
        }

        const data: InvitationData = await response.json();
        setInvitationData(data);

        // Pre-fill form with existing data if available
        if (data.message) {
          setFormData({
            message: data.message || "",
          });
        }
        setPageStatus("success");
      } catch (error) {
        console.error('[Invitation] Erro ao buscar convite:', error);
        setInvitationError("Convite não encontrado ou expirado. Entre em contato com os anfitriões.");
        setPageStatus("error");
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
        .select("id, gift_name, description, link, selected_by_guest_id, gift_kind, suggested_amount, pix_copy_paste_code, qr_image_url, is_public")
        .eq("wedding_id", weddingDetails.id)
        .eq("is_public", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching gifts:", error);
      } else {
        const all = data || [];
        const traditional = all.filter((g: any) => (g.gift_kind ?? 'traditional') !== 'pix');
        const pix = all.filter((g: any) => g.gift_kind === 'pix');

        // Tradicional: respeitar regra de visibilidade (livre ou meu)
        const traditionalVisible = traditional.filter((g: any) =>
          !g.selected_by_guest_id || g.selected_by_guest_id === invitationData.guest_id
        );
        setGifts(traditionalVisible as GiftItem[]);

        setPixGifts(pix.map((g: any) => ({
          id: g.id,
          gift_name: g.gift_name,
          description: g.description,
          suggested_amount: g.suggested_amount,
          pix_copy_paste_code: g.pix_copy_paste_code,
          qr_image_url: g.qr_image_url,
        })));

        const alreadySelected = traditional.find((g: any) => g.selected_by_guest_id === invitationData.guest_id);
        if (alreadySelected) {
          setSelectedGiftId(alreadySelected.id);
          setHasExistingGift(true);
        } else {
          setHasExistingGift(false);
        }

        // Buscar PIX já confirmados anteriormente para este convidado (caso já respondeu)
        const { data: existingPix } = await supabase
          .from("gift_pix_selections")
          .select("gift_item_id")
          .eq("guest_id", invitationData.guest_id);
        if (existingPix && existingPix.length > 0) {
          const ids = existingPix.map((r: any) => r.gift_item_id);
          setSelectedPixIds(ids);
          setConfirmedPixDetails(
            pix
              .filter((g: any) => ids.includes(g.id))
              .map((g: any) => ({
                id: g.id,
                gift_name: g.gift_name,
                description: g.description,
                suggested_amount: g.suggested_amount,
                pix_copy_paste_code: g.pix_copy_paste_code,
                qr_image_url: g.qr_image_url,
              }))
          );
        }
      }
      setLoadingGifts(false);
    };

    fetchGifts();
  }, [weddingDetails?.id, invitationData?.id, invitationData?.guest_id]);

  const handleRSVPResponse = async (attending: boolean) => {
    
    if (!invitation_code || !invitationData) return;

    try {
      const validatedData = rsvpResponseSchema.parse(formData);
      setSubmitting(true);

      // Submeter RSVP + presente tradicional + PIX em payload único
      const payload = {
        token: invitation_code,
        attending,
        message: validatedData.message || undefined,
        gift_item_id: attending ? (selectedGiftId || null) : null,
        pix_item_ids: attending ? selectedPixIds : [],
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rsvp-respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar resposta');
      }

      // Capturar detalhes dos PIX confirmados para exibir na tela de sucesso
      const confirmedPix = pixGifts.filter((p) => selectedPixIds.includes(p.id));
      setConfirmedPixDetails(confirmedPix);

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
          ? (confirmedPix.length > 0
              ? "Obrigado por confirmar! Veja abaixo os PIX selecionados."
              : "Obrigado por confirmar! Você será redirecionado em instantes...")
          : "Sentiremos sua falta 💔 Você será redirecionado em instantes...",
      });

      // Inicia o timer; será pausado se o convidado abrir um QR Code
      startRedirectTimer();
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

  const handleCopyPix = async (code: string | null) => {
    if (!code) {
      toast({ title: "Código indisponível", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Código PIX copiado." });
    } catch {
      toast({
        title: "Não foi possível copiar automaticamente. Copie o código manualmente.",
        variant: "destructive",
      });
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
              guest_id: invitationData.guest_id,
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

    if (pageStatus === "loading") {
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

    if (pageStatus === "error" || !invitationData) {
      return (
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto shadow-elegant border-destructive">
              <CardHeader>
                <CardTitle className="text-3xl font-serif text-center text-destructive">
                  Convite não encontrado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {invitationError || "Convite não encontrado ou expirado. Entre em contato com os anfitriões."}
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
                    ? "Sua presença está confirmada! Mal podemos esperar para celebrar com você! Você será redirecionado em instantes..."
                    : "Obrigado por nos informar. Esperamos vê-lo em outra ocasião! 💔 Você será redirecionado em instantes..."
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
              {invitationData.attending && confirmedPixDetails.length > 0 && (
                <CardContent className="space-y-4 border-t pt-6">
                  <h3 className="text-xl font-serif font-semibold flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" /> Suas contribuições PIX
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deseja visualizar novamente {confirmedPixDetails.length > 1 ? "os QR Codes PIX" : "o QR Code PIX"}?
                  </p>
                  <div className="space-y-3">
                    {confirmedPixDetails.map((pix) => (
                      <div
                        key={pix.id}
                        className="rounded-lg border p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">PIX – {pix.gift_name}</p>
                          {pix.suggested_amount != null && (
                            <p className="text-xs text-primary">
                              Sugestão: R$ {Number(pix.suggested_amount).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openQrViewer(pix)}
                        >
                          <QrCode className="w-4 h-4 mr-2" /> Ver QR Code
                        </Button>
                      </div>
                    ))}
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

              {pixGifts.length > 0 && (
                <div className="space-y-3 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-primary" /> Contribuições PIX
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Opcional. Você pode selecionar quantos quiser.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {pixGifts.map((pix) => {
                      const checked = selectedPixIds.includes(pix.id);
                      return (
                        <label
                          key={pix.id}
                          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                            checked ? "border-primary bg-primary/5" : "hover:border-primary/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              void handleTogglePix(pix, e.target.checked);
                            }}
                            className="mt-1 h-4 w-4 accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{pix.gift_name}</p>
                            {pix.description && (
                              <p className="text-sm text-muted-foreground">{pix.description}</p>
                            )}
                            {pix.suggested_amount != null && (
                              <p className="text-sm text-primary mt-1">
                                Sugestão: R$ {Number(pix.suggested_amount).toFixed(2).replace('.', ',')}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}


              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button 
                  onClick={() => handleRSVPResponse(true)}
                  disabled={submitting}
                  size="lg"
                  className="confirm-button w-full max-w-full px-4 py-3 text-sm sm:text-lg rounded-lg flex items-center justify-center leading-tight whitespace-normal overflow-hidden"
                >
                  <span className="block text-center break-words min-w-0">
                    {submitting ? "Enviando..." : "✓ Sim, estarei presente!"}
                  </span>
                </Button>
                <Button 
                  onClick={() => handleRSVPResponse(false)}
                  disabled={submitting}
                  variant="outline"
                  size="lg"
                  className="confirm-button w-full max-w-full px-4 py-3 text-sm sm:text-lg rounded-lg flex items-center justify-center leading-tight whitespace-normal overflow-hidden"
                >
                  <span className="block text-center break-words min-w-0">
                    {submitting ? "Enviando..." : "✗ Não poderei ir"}
                  </span>
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
              className="fixed bottom-6 right-6 rounded-full shadow-lg px-6 py-6 text-lg z-50 overflow-hidden"
              size="lg"
              style={{
                opacity: 0,
                transform: 'translateY(80px)',
                animation: 'gift-btn-slide-up 1.1s cubic-bezier(0.22, 1, 0.36, 1) 1.2s forwards',
              }}
            >
              {/* Diagonal shine overlay */}
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.35) 55%, transparent 80%)',
                  animation: 'gift-btn-shine 3.5s ease-in-out infinite',
                }}
              />
              <Gift className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">Lista de Presentes</span>
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
                        const isSelectedByOther = gift.selected_by_guest_id && gift.selected_by_guest_id !== invitationData?.guest_id;
                        const isSelectedByMe = gift.selected_by_guest_id === invitationData?.guest_id;

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

      <PixQrViewerDialog
        open={qrViewerOpen}
        onOpenChange={handleQrViewerOpenChange}
        pix={qrViewerData}
      />
    </div>
  );
};

export default Invitation;
