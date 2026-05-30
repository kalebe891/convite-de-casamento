import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import CountdownTimer from "@/components/wedding/CountdownTimer";
import { formatEventTitle } from "@/lib/eventType";

interface HeroSectionProps {
  weddingDetails: any;
}

const HeroSection = ({ weddingDetails }: HeroSectionProps) => {
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [firstEventTime, setFirstEventTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!weddingDetails?.id) return;

      const [photoRes, timelineRes] = await Promise.all([
        supabase
          .from("photos")
          .select("photo_url")
          .eq("wedding_id", weddingDetails.id)
          .eq("is_main", true)
          .maybeSingle(),
        supabase
          .from("timeline_events")
          .select("time")
          .eq("wedding_id", weddingDetails.id)
          .eq("is_public", true)
          .order("display_order", { ascending: true })
          .limit(1),
      ]);

      if (!photoRes.error && photoRes.data) {
        setMainPhoto(photoRes.data.photo_url);
      }

      if (!timelineRes.error && timelineRes.data?.[0]) {
        setFirstEventTime(timelineRes.data[0].time);
      }
    };

    fetchData();
  }, [weddingDetails?.id]);

  const renderContent = () => (
    <>
      <Heart className="mx-auto mb-6 h-12 w-12 text-primary animate-scale-in sm:h-16 sm:w-16" />
      <h1 className="mx-auto mb-4 max-w-full break-words font-serif text-5xl font-bold leading-tight text-foreground sm:text-6xl md:text-8xl">
        {formatEventTitle(weddingDetails, "Nosso Evento")}
      </h1>
      <div className="h-px w-32 mx-auto bg-primary my-6"></div>
      <p className="text-2xl md:text-3xl text-muted-foreground mb-8">
        {format(new Date(weddingDetails.wedding_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </p>
      <CountdownTimer
        targetDate={weddingDetails.wedding_date}
        firstEventTime={firstEventTime}
      />
      {weddingDetails.venue_name && (
        <p className="text-xl text-muted-foreground mt-8">
          {weddingDetails.venue_name}
        </p>
      )}
    </>
  );

  if (!weddingDetails) {
    return (
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-muted/30">
        <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-4 text-center">
          <Skeleton className="w-16 h-16 mx-auto rounded-full" />
          <SkeletonText variant="heading" className="mx-auto" />
          <Skeleton className="h-px w-32 mx-auto" />
          <SkeletonText variant="title" className="mx-auto" />
          <SkeletonText variant="body" className="mx-auto" />
        </div>
      </section>
    );
  }

  if (!mainPhoto) {
    return (
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-muted/30">
        <div className="relative z-10 w-full max-w-4xl px-4 text-center animate-fade-in-up">
          {renderContent()}
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
          imageLoaded ? "animate-fade-in" : "opacity-0"
        }`}
        style={{ backgroundImage: `url(${mainPhoto})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background/80"></div>
      </div>

      <img
        src={mainPhoto}
        alt="Hero"
        className="hidden"
        onLoad={() => setImageLoaded(true)}
      />

      <div className="relative z-10 w-full max-w-4xl px-4 text-center animate-fade-in-up">
        {renderContent()}
      </div>

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-primary rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
