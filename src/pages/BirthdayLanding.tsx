import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cake, ArrowLeft, Construction } from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import SEO from "@/components/seo/SEO";

const BirthdayLanding = () => {
  return (
    <div className="marketing-theme min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="Convites para Aniversários | Em breve"
        description="Estamos preparando uma experiência completa de convites digitais para aniversários. Em breve."
        path="/aniversario"
      />
      <MarketingHeader />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 sm:py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-primary backdrop-blur">
              <Construction className="h-3.5 w-3.5" />
              🚧 Em breve
            </span>

            <div className="mt-8 flex justify-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Cake className="h-7 w-7" />
              </span>
            </div>

            <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Convites para Aniversários
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Estamos preparando uma experiência completa para aniversários.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Em breve você poderá criar convites digitais para aniversários com
              confirmação de presença, lista de convidados, presentes,
              personalização completa e muito mais.
            </p>

            <div className="mt-10 flex justify-center">
              <Link to="/">
                <Button size="lg" variant="outline" className="group">
                  <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Voltar para a página inicial
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

export default BirthdayLanding;
