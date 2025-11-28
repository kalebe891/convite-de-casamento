import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventsManager from "@/components/admin/EventsManager";
import EventsSection from "@/components/wedding/EventsSection";
import { Separator } from "@/components/ui/separator";

const Eventos = () => {
  const [events, setEvents] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("id")
        .single();

      if (weddingData) {
        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("wedding_id", weddingData.id)
          .order("event_date");

        setEvents(eventsData || []);
      }
    };

    fetchEvents();

    // Realtime subscription
    const channel = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-8">
      <EventsManager />
      
      <Separator className="my-8" />
      
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-serif font-bold mb-6 text-center">
          Pré-visualização (Como aparece na página inicial)
        </h2>
        <EventsSection events={events} />
      </div>
    </div>
  );
};

export default Eventos;
