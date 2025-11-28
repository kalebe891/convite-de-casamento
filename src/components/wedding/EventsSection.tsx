import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EventsSectionProps {
  events: any[] | null;
  weddingDetails: any | null;
}

const EventsSection = ({ events, weddingDetails }: EventsSectionProps) => {
  // Mostrar skeleton enquanto carrega
  if (!events) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="h-12 w-80 mx-auto bg-muted/50 rounded-lg animate-pulse mb-16" />
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="bg-card rounded-lg shadow-soft p-6 space-y-4 animate-fade-in">
                <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
                <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                <div className="space-y-3 mt-4">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 bg-muted/50 rounded animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
                      <div className="h-3 w-full bg-muted/50 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Se não houver eventos mas houver dados de local no wedding_details, criar card genérico
  const hasVenueInfo = weddingDetails?.venue_name || weddingDetails?.venue_address;
  
  if (events.length === 0 && !hasVenueInfo) {
    return null;
  }

  // Se não houver eventos mas houver dados de local, criar evento genérico
  const displayEvents = events.length > 0 
    ? events 
    : hasVenueInfo 
    ? [{
        event_name: weddingDetails.venue_name || "Celebração",
        event_date: weddingDetails.wedding_date,
        location: weddingDetails.venue_name || "",
        address: weddingDetails.venue_address || "",
        description: "Detalhes do local da celebração",
        maps_url: weddingDetails.venue_map_url || null,
      }]
    : [];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Detalhes da Celebração
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {displayEvents.map((event, index) => (
            <Card key={index} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 animate-fade-in">
              <CardHeader>
                <CardTitle className="text-3xl font-serif text-primary">
                  {event.event_name}
                </CardTitle>
                <CardDescription className="text-lg">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.event_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.event_date), "HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                    {event.address && <p className="text-sm text-muted-foreground mt-1">{event.address}</p>}
                    {event.maps_url && (
                      <a 
                        href={event.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                      >
                        Ver no Google Maps →
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
