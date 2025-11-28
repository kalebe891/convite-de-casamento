import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

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
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!weddingId) return;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("time", { ascending: true });

      setEvents(data || []);
    };

    fetchEvents();
  }, [weddingId]);

  if (events.length === 0) return null;

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
