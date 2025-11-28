import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
import { LogIn } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [events, setEvents] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

        setEvents(eventsData || null);
        setPhotos(photosData || null);
      }
      
      setIsLoading(false);
    };

    fetchWeddingData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-serif font-bold text-primary">
            {weddingDetails ? `${weddingDetails.bride_name} & ${weddingDetails.groom_name}` : "Nosso Casamento"}
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(session ? "/admin" : "/auth")}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              {session ? "Painel" : "Login Admin"}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-20">
        <HeroSection weddingDetails={weddingDetails} />
        <StorySection weddingDetails={weddingDetails} />
        <EventsSection events={events} weddingDetails={weddingDetails} />
        <TimelineSection weddingId={weddingDetails?.id || null} />
        <BuffetSection weddingId={weddingDetails?.id || null} />
        <PlaylistSection weddingId={weddingDetails?.id || null} />
        <GiftsSection weddingId={weddingDetails?.id || null} />
        <ConfirmedGuestsSection weddingId={weddingDetails?.id || null} />
        <GallerySection photos={photos} />
      </main>

      <footer className="bg-card border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Convites de Casamento. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
