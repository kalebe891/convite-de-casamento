import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import HeroEditorial from "@/components/wedding/HeroEditorial";
import StorySection from "@/components/wedding/StorySection";
import EventsSection from "@/components/wedding/EventsSection";
import GallerySection from "@/components/wedding/GallerySection";
import TimelineSection from "@/components/wedding/TimelineSection";
import BuffetSection from "@/components/wedding/BuffetSection";
import PlaylistSection from "@/components/wedding/PlaylistSection";
import GiftsSection from "@/components/wedding/GiftsSection";
import ConfirmedGuestsSection from "@/components/wedding/ConfirmedGuestsSection";
import { Button } from "@/components/ui/button";
import { Home, LogIn } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useWedding } from "@/contexts/WeddingContext";
import { buildTenantAdminUrl, dbToUrl, formatEventTitle } from "@/lib/eventType";

/**
 * IndexEditorial — Renderer raiz da variante "editorial".
 *
 * Idêntico estruturalmente ao Index legacy, exceto pelo Hero (HeroEditorial).
 * As demais seções permanecem as mesmas — a paleta editorial é aplicada via
 * tokens CSS [data-theme="editorial"] injetados pelo ThemeRenderer.
 */
const IndexEditorial = () => {
  const navigate = useNavigate();
  const { wedding, weddingId, loading, error } = useWedding();
  const tenantAdminUrl = buildTenantAdminUrl(wedding);
  const title = formatEventTitle(wedding, "Nosso Evento");

  const [session, setSession] = useState(null);
  const [events, setEvents] = useState(null);
  const [photos, setPhotos] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!weddingId) return;
    (async () => {
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("event_date");
      const { data: photosData } = await supabase
        .from("photos")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("display_order");
      setEvents(eventsData || null);
      setPhotos(photosData || null);
    })();
  }, [weddingId]);

  if (!loading && (error || !wedding)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-4">
          <h1 className="text-2xl font-serif text-foreground mb-2">Evento não encontrado</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-public min-h-screen overflow-x-hidden bg-background font-editorial-body">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto flex min-w-0 items-center justify-between gap-3 px-4 py-4">
          <h1
            className="min-w-0 truncate font-serif text-xl font-light tracking-wide text-primary sm:text-2xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(session ? tenantAdminUrl ?? "/admin" : "/auth")}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              {session ? "Painel" : "Login Admin"}
            </Button>
          </div>
        </div>
      </header>

      <main className="overflow-x-hidden pt-20">
        <HeroEditorial />
        <StorySection weddingDetails={wedding} />
        <EventsSection events={events} />
        <TimelineSection weddingId={weddingId} />
        <BuffetSection weddingId={weddingId} />
        <PlaylistSection weddingId={weddingId} />
        <GiftsSection weddingId={weddingId} />
        <ConfirmedGuestsSection weddingId={weddingId} />
        <GallerySection photos={photos} />
      </main>

      <footer className="bg-card border-t border-border/40 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Convites de Evento. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default IndexEditorial;
