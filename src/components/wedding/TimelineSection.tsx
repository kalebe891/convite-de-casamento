import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { SkeletonCard } from "@/components/ui/skeleton-card";

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
      // Fetch section visibility setting
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

      // Fetch timeline events
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

  // Show skeleton while loading
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
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Cronograma
        </h2>

        <div className="max-w-3xl mx-auto space-y-6">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="flex items-start gap-4 p-6 bg-card rounded-lg shadow-soft animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
