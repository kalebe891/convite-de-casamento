import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EventsSectionProps {
  events: any[] | null;
}

// Helper para converter data do banco mantendo o horário local
const parseEventDate = (dateString: string) => {
  // Remove o timezone para evitar conversão automática
  const localDateString = dateString.replace(/[+-]\d{2}:?\d{2}$/, '').replace('Z', '');
  return parseISO(localDateString);
};

const EventsSection = ({ events }: EventsSectionProps) => {
  // Não renderiza nada enquanto os dados não estiverem carregados
  if (!events) {
    return null;
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Detalhes da Celebração
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {events.map((event, index) => (
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
                      {format(parseEventDate(event.event_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">
                      {format(parseEventDate(event.event_date), "HH:mm")}
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
