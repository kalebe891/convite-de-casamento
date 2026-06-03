import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Cake } from "lucide-react";
import { isValidRouteEventType, urlToDb } from "@/lib/eventType";
import ShowcaseSection from "@/components/marketing/ShowcaseSection";
import NotFound from "./NotFound";

const CONTENT = {
  casamento: {
    title: "Convites de Casamento",
    subtitle: "Tudo o que você precisa para tornar seu grande dia inesquecível.",
    Icon: Heart,
  },
  aniversario: {
    title: "Convites de Aniversário",
    subtitle: "Celebre mais um ano com um convite digital encantador.",
    Icon: Cake,
  },
} as const;

const EventTypeLanding = () => {
  const { eventType } = useParams<{ eventType: string }>();

  if (!isValidRouteEventType(eventType)) {
    return <NotFound />;
  }

  const { title, subtitle, Icon } = CONTENT[eventType];

  return (
    <div className="marketing-theme min-h-screen bg-gradient-elegant flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Link to="/" className="text-2xl font-serif font-bold text-primary">
          Convites
        </Link>
        <Link to="/auth">
          <Button variant="outline" size="sm">Entrar</Button>
        </Link>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <Icon className="w-16 h-16 text-primary mb-6" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
        </div>

        <ShowcaseSection
          eventType={urlToDb(eventType)!}
          title={`${title} em destaque`}
          subtitle="Convites publicados pelos próprios anfitriões."
        />
      </main>

      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        © 2025 Convites. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default EventTypeLanding;
