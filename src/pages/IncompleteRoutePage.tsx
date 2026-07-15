import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MailQuestion, ArrowRight } from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import SEO from "@/components/seo/SEO";

interface IncompleteRoutePageProps {
  title?: string;
  description?: string;
  destination: string;
  seconds?: number;
}

const IncompleteRoutePage = ({
  title = "Convite não encontrado",
  description = "Para visualizar um convite é necessário utilizar o link enviado pelo anfitrião.",
  destination,
  seconds = 7,
}: IncompleteRoutePageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(seconds);
  const navigatedRef = useRef(false);

  useEffect(() => {
    const go = () => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigate(destination, { replace: true });
    };

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          go();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [destination, navigate]);

  const handleGoNow = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigate(destination, { replace: true });
  };

  return (
    <div className="marketing-theme min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title={`${title} | Convites`}
        description={description}
        path={location.pathname}
        noindex
      />
      <MarketingHeader />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 sm:py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MailQuestion className="h-7 w-7" />
              </span>
            </div>

            <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>

            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border/60 bg-card/60 px-6 py-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">
                Redirecionando automaticamente em
              </p>
              <p
                className="mt-2 font-serif text-5xl font-semibold tabular-nums text-foreground"
                aria-live="polite"
              >
                {countdown}
              </p>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" onClick={handleGoNow} className="group">
                Voltar agora
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Link to="/">
                <Button size="lg" variant="outline">
                  Página inicial
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
};

export default IncompleteRoutePage;
