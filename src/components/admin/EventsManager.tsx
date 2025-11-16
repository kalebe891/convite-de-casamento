import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

const EventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    eventType: "",
    eventName: "",
    eventDate: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("id")
        .single();

      if (weddingData) {
        setWeddingId(weddingData.id);

        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("wedding_id", weddingData.id)
          .order("event_date");

        setEvents(eventsData || []);
      }
    };

    fetchData();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!weddingId) {
      toast({
        title: "Error",
        description: "Please create wedding details first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("events")
        .insert({
          wedding_id: weddingId,
          event_type: newEvent.eventType,
          event_name: newEvent.eventName,
          event_date: newEvent.eventDate,
          location: newEvent.location,
          description: newEvent.description,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents([...events, data]);
      setNewEvent({
        eventType: "",
        eventName: "",
        eventDate: "",
        location: "",
        description: "",
      });

      toast({
        title: "Success!",
        description: "Event added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add event.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      setEvents(events.filter((e) => e.id !== id));

      toast({
        title: "Success!",
        description: "Event deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-3xl font-serif flex items-center gap-2">
            <Plus className="w-6 h-6" />
            Add New Event
          </CardTitle>
          <CardDescription>Add ceremony, reception, or other events</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Input
                  id="eventType"
                  value={newEvent.eventType}
                  onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                  placeholder="e.g., Ceremony, Reception"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={newEvent.eventName}
                  onChange={(e) => setNewEvent({ ...newEvent, eventName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date & Time</Label>
                <Input
                  id="eventDate"
                  type="datetime-local"
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full">Add Event</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Existing Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No events added yet.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-start justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{event.event_name}</h3>
                    <p className="text-sm text-muted-foreground">{event.event_type}</p>
                    <p className="text-sm mt-2">{new Date(event.event_date).toLocaleString()}</p>
                    {event.location && <p className="text-sm">📍 {event.location}</p>}
                    {event.description && <p className="text-sm mt-2">{event.description}</p>}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsManager;
