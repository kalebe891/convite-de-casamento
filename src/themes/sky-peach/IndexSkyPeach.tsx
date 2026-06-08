import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import HeroSkyPeach from "@/components/wedding/HeroSkyPeach";
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
import SEO from "@/components/seo/SEO";
import { useWedding } from "@/contexts/WeddingContext";
import { buildTenantAdminUrl, dbToUrl, formatEventTitle } from "@/lib/eventType";
import { buildTenantSeo } from "@/lib/tenantSeo";

/**
 * IndexSkyPeach — Renderer raiz do tema "sky-peach".
 * Wrapper que renderiza HeroSkyPeach e reutiliza as seções compartilhadas.
 * Paleta aplicada via tokens [data-theme="sky-peach"] injetados pelo ThemeRenderer.
 */
const IndexSkyPeach = () => {
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
          <h1 className="text-2xl text-foreground mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Evento não encontrado
          </h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const mainPhoto = photos?.find((p: { is_main?: boolean }) => p.is_main)?.photo_url ?? null;
  const seo = buildTenantSeo(wedding, mainPhoto);

  return (
    <div
      className="tenant-public min-h-screen overflow-x-hidden bg-background"
      style={{ fontFamily: "'Figtree', sans-serif" }}
    >
      {wedding && <SEO {...seo} />}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto flex min-w-0 items-center justify-between gap-3 px-4 py-4">
          <h1
            className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/${dbToUrl(wedding?.event_type) ?? "casamento"}`)}
              className="gap-2"
              aria-label="Página inicial"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
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
        <HeroSkyPeach />
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
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2025 Convites de Evento. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default IndexSkyPeach;
