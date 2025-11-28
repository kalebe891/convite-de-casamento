import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StorySectionProps {
  weddingDetails: any;
}

const StorySection = ({ weddingDetails }: StorySectionProps) => {
  const [secondaryPhoto, setSecondaryPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSecondaryPhoto = async () => {
      if (!weddingDetails?.id) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("wedding_id", weddingDetails.id)
        .eq("is_secondary", true)
        .maybeSingle();

      if (data) {
        setSecondaryPhoto(data.photo_url);
      }
      
      setIsLoading(false);
    };

    fetchSecondaryPhoto();

    // Realtime para atualizar foto secundária
    const photosChannel = supabase
      .channel('story-photos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos'
        },
        () => {
          fetchSecondaryPhoto();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(photosChannel);
    };
  }, [weddingDetails?.id]);

  // Mostrar skeleton enquanto carrega
  if (!weddingDetails || isLoading) {
    return (
      <section className="py-20 bg-gradient-elegant">
        <div className="container mx-auto px-4">
          <div className="h-12 w-64 mx-auto bg-muted/50 rounded-lg animate-pulse mb-16" />
          
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="animate-fade-in">
              <div className="aspect-[4/3] w-full bg-muted/50 rounded-lg animate-pulse" />
            </div>
            
            <div className="space-y-6 animate-fade-in-up">
              <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-full bg-muted/50 rounded animate-pulse mt-6" />
              <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-muted/50 rounded animate-pulse" />
              <div className="pt-6">
                <div className="h-8 w-56 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!secondaryPhoto) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Nossa História
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <img
              src={secondaryPhoto}
              alt="Casal"
              className="rounded-lg shadow-elegant w-full h-auto object-cover"
            />
          </div>
          
          <div className="space-y-6 animate-fade-in-up">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {weddingDetails?.story || 
                "Desde o momento em que nos conhecemos, soubemos que algo especial havia começado. Entre risadas, aventuras e inúmeras memórias, nosso amor cresceu mais forte a cada dia."}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Agora, cercados por nossos entes queridos, estamos prontos para começar a maior aventura de todas – passar para sempre juntos.
            </p>
            <div className="pt-6">
              <p className="text-2xl font-serif text-foreground italic">
                "Duas almas, um coração"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StorySection;
