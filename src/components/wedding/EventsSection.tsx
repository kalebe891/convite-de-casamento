import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EventsSectionProps {
  events: any[];
}

const EventsSection = ({ events }: EventsSectionProps) => {
  const defaultEvents = [
    {
      event_name: "Cerimônia",
      event_date: "2026-04-18T17:00:00",
      location: "Espaço Verde Eventos",
      description: "Junte-se a nós para a cerimônia de casamento",
      address: "Alameda Santana, Qd.102 - Lt.01 - Cardoso Continuação, Aparecida de Goiânia - GO",
      maps_url: "https://www.google.com/maps/dir//Espa%C3%A7o+Verde+Eventos+-+Alameda+Santana,+Qd.102+-+Lt.01+-+Cardoso+Continua%C3%A7%C3%A3o,+Aparecida+de+Goi%C3%A2nia+-+GO,+74933-000/@-16.764805,-49.3087212,17z/data=!4m17!1m7!3m6!1s0x935ef900479b9a37:0x76499e7e7fd76912!2sEspa%C3%A7o+Verde+Eventos!8m2!3d-16.7648102!4d-49.3061409!16s%2Fg%2F11l_0sr5xz!4m8!1m0!1m5!1m1!1s0x935ef900479b9a37:0x76499e7e7fd76912!2m2!1d-49.3061409!2d-16.7648102!3e0?authuser=0&entry=ttu&g_ep=EgoyMDI1MTExMi4wIKXMDSoASAFQAw%3D%3D"
    }
  ];

  const displayEvents = events.length > 0 ? events : defaultEvents;

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
