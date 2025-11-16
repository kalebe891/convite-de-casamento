import { format } from "date-fns";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EventsSectionProps {
  events: any[];
}

const EventsSection = ({ events }: EventsSectionProps) => {
  const defaultEvents = [
    {
      event_name: "Ceremony",
      event_date: "2025-06-15T15:00:00",
      location: "Grace Chapel",
      description: "Join us for the wedding ceremony"
    },
    {
      event_name: "Reception",
      event_date: "2025-06-15T18:00:00",
      location: "Garden Pavilion",
      description: "Celebrate with dinner and dancing"
    }
  ];

  const displayEvents = events.length > 0 ? events : defaultEvents;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Celebration Details
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
                      {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.event_date), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">{event.location}</p>
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
