import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { motion } from "framer-motion";

interface EventsSectionProps {
  events: any[] | null;
}

const parseEventDate = (dateString: string) => {
  const localDateString = dateString.replace(/[+-]\d{2}:?\d{2}$/, '').replace('Z', '');
  return parseISO(localDateString);
};

const EventsSection = ({ events }: EventsSectionProps) => {
  if (!events) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <SkeletonText variant="heading" className="mx-auto max-w-md" />
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} lines={3} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-5xl font-serif font-bold text-center mb-16 text-foreground"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Detalhes da Celebração
        </motion.h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {events.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="shadow-soft hover:shadow-elegant transition-shadow duration-300 h-full">
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
                    <p className="font-medium">
                      {format(parseEventDate(event.event_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-1" />
                    <p className="font-medium">
                      {format(parseEventDate(event.event_date), "HH:mm")}
                    </p>
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
