import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";

const MarketingHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Convites
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/casamento" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Casamento
          </Link>
          <Link to="/aniversario" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Aniversário
          </Link>
          <a href="#recursos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Recursos
          </a>
          <a href="#como-funciona" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Como funciona
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle label="Tema" />
          <Link to="/auth">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default MarketingHeader;
