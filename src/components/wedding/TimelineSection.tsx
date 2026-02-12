import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { motion } from "framer-motion";

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
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <SkeletonText variant="heading" className="mx-auto max-w-md" />
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!showSection || events.length === 0) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-5xl font-serif font-bold text-center mb-16 text-foreground"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Cronograma
        </motion.h2>

        <div className="max-w-3xl mx-auto space-y-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              className="flex items-start gap-4 p-6 bg-card rounded-lg shadow-soft"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex-shrink-0 w-20 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-lg font-semibold text-primary">
                    {event.time}
                  </span>
                </div>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xl font-medium text-foreground">
                  {event.activity}
                </h3>
                {event.observation && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{event.observation}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
