import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useWedding } from "@/contexts/WeddingContext";

interface TimelineEvent {
  id: string;
  time: string;
  activity: string;
  observation: string | null;
  is_public: boolean;
  display_order: number;
}

interface TimelineSectionProps {
  weddingId: string | null;
}

const TimelineSection = ({ weddingId }: TimelineSectionProps) => {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [showSection, setShowSection] = useState<boolean>(true);

  useEffect(() => {
    if (!weddingId) return;

    const fetchData = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("show_timeline_section")
        .eq("id", weddingId)
        .single();

      if (!weddingData?.show_timeline_section) {
        setShowSection(false);
        setEvents([]);
        return;
      }

      setShowSection(true);

      const { data } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("time", { ascending: true });

      setEvents(data || []);
    };

    fetchData();
  }, [weddingId]);

  if (events === null) {
    return (
      <section className="py-24 bg-background">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-16">
            <SkeletonText variant="body" className="mx-auto max-w-[120px] mb-3" />
            <SkeletonText variant="heading" className="mx-auto max-w-md" />
          </div>
          <div className="space-y-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6">
                <Skeleton className="h-16 flex-1 rounded-lg" />
                <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" />
                <Skeleton className="h-16 flex-1 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!showSection || events.length === 0) return null;

  return (
    <section className="py-24 bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-sans text-xs tracking-[0.4em] uppercase text-muted-foreground mb-3">
            Programação do dia
          </p>
          <h2 className="font-serif text-3xl md:text-5xl italic text-foreground">
            Cronograma
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

          <div className="space-y-12">
            {events.map((event, i) => {
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={event.id}
                  className={`flex items-center gap-4 ${isEven ? "flex-row" : "flex-row-reverse"}`}
                  initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  {/* Content */}
                  <div className={`flex-1 ${isEven ? "text-right" : "text-left"}`}>
                    <p className="font-sans text-xs tracking-[0.2em] text-muted-foreground mb-1">
                      {event.time}
                    </p>
                    <p className="text-lg text-foreground/90">
                      {event.activity}
                    </p>
                    {event.observation && (
                      <p className="text-sm text-muted-foreground/70 italic mt-1">
                        {event.observation}
                      </p>
                    )}
                  </div>

                  {/* Center dot */}
                  <div className="w-3 h-3 rounded-full border border-primary bg-background flex-shrink-0 z-10" />

                  {/* Spacer */}
                  <div className="flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
