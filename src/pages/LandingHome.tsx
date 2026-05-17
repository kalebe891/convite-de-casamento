import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Cake } from "lucide-react";

const LandingHome = () => {
  return (
    <div className="min-h-screen bg-gradient-elegant flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-primary">Convites</h1>
        <Link to="/auth">
          <Button variant="outline" size="sm">Entrar</Button>
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Crie convites digitais inesquecíveis
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          Plataforma completa para convites de casamento e aniversário com RSVP, lista de presentes, check-in e muito mais.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl w-full">
          <Link
            to="/casamento"
            className="group p-8 rounded-2xl border border-border bg-card hover:shadow-elegant transition-all"
          >
            <Heart className="w-12 h-12 mx-auto mb-4 text-primary group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-serif font-bold mb-2">Casamento</h3>
            <p className="text-sm text-muted-foreground">
              Convite completo para o seu grande dia
            </p>
          </Link>

          <Link
            to="/aniversario"
            className="group p-8 rounded-2xl border border-border bg-card hover:shadow-elegant transition-all"
          >
            <Cake className="w-12 h-12 mx-auto mb-4 text-primary group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-serif font-bold mb-2">Aniversário</h3>
            <p className="text-sm text-muted-foreground">
              Celebre mais um ano com estilo
            </p>
          </Link>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        © 2025 Convites. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default LandingHome;
