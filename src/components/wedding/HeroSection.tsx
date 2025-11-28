import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-wedding.jpg";
import { Heart } from "lucide-react";

interface HeroSectionProps {
  weddingDetails: any;
}

const HeroSection = ({ weddingDetails }: HeroSectionProps) => {
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const fetchMainPhoto = async () => {
      if (!weddingDetails?.id) return;

      const { data, error } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("wedding_id", weddingDetails.id)
        .eq("is_main", true)
        .single();

      if (!error && data) {
        setMainPhoto(data.photo_url);
      }
    };

    fetchMainPhoto();
  }, [weddingDetails?.id]);

  const backgroundImage = mainPhoto || heroImage;

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
          imageLoaded ? "animate-fade-in" : "opacity-0"
        }`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background"></div>
      </div>

      {/* Preload image */}
      <img
        src={backgroundImage}
        alt="Hero"
        className="hidden"
        onLoad={() => setImageLoaded(true)}
      />

      <div className="relative z-10 text-center px-4 animate-fade-in-up">
        <Heart className="w-16 h-16 mx-auto mb-6 text-primary animate-scale-in" />
        
        <h1 className="text-6xl md:text-8xl font-serif font-bold mb-4 text-foreground">
          {weddingDetails?.bride_name || "Beatriz"} & {weddingDetails?.groom_name || "Diogo"}
        </h1>
        
        <div className="h-px w-32 mx-auto bg-primary my-6"></div>
        
        <p className="text-2xl md:text-3xl text-muted-foreground mb-8">
          {weddingDetails?.wedding_date 
            ? format(new Date(weddingDetails.wedding_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            : "18 de Abril de 2026"}
        </p>
        
        {weddingDetails?.venue_name && (
          <p className="text-xl text-muted-foreground">
            {weddingDetails.venue_name}
          </p>
        )}
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
