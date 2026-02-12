import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonImage } from "@/components/ui/skeleton-image";
import { motion } from "framer-motion";

interface StorySectionProps {
  weddingDetails: any;
}

const StorySection = ({ weddingDetails }: StorySectionProps) => {
  const [secondaryPhoto, setSecondaryPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchSecondaryPhoto = async () => {
      if (!weddingDetails?.id) return;

      const { data } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("wedding_id", weddingDetails.id)
        .eq("is_secondary", true)
        .maybeSingle();

      if (data) {
        setSecondaryPhoto(data.photo_url);
      }
    };

    fetchSecondaryPhoto();

    const photosChannel = supabase
      .channel('story-photos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photos' },
        () => { fetchSecondaryPhoto(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(photosChannel); };
  }, [weddingDetails?.id]);

  if (!weddingDetails) return null;

  return (
    <section className="py-20 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-5xl font-serif font-bold text-center mb-16 text-foreground"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Nossa História
        </motion.h2>
        
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {!secondaryPhoto ? (
              <SkeletonImage className="w-full h-[500px]" />
            ) : (
              <img
                src={secondaryPhoto}
                alt="Casal"
                className="rounded-lg shadow-elegant w-full h-auto object-cover"
              />
            )}
          </motion.div>
          
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
              {weddingDetails?.story || 
                "Desde o momento em que nos conhecemos, soubemos que algo especial havia começado. Entre risadas, aventuras e inúmeras memórias, nosso amor cresceu mais forte a cada dia.\n\nAgora, cercados por nossos entes queridos, estamos prontos para começar a maior aventura de todas – passar para sempre juntos."}
            </p>
            {weddingDetails?.couple_message && (
              <div className="pt-6">
                <p className="text-2xl font-serif text-foreground italic">
                  "{weddingDetails.couple_message}"
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StorySection;
