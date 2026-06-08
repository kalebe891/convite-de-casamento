import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { Button } from "@/components/ui/button";
import { formatEventTitle } from "@/lib/eventType";
import { useWedding } from "@/contexts/WeddingContext";
import { useHeroMedia } from "@/hooks/useHeroMedia";

/**
 * HeroMinimal — Hero estrutural do tema "minimal".
 *
 * Layout split: 50/50 desktop (imagem | conteúdo), empilhado no mobile
 * (imagem acima, conteúdo abaixo). Sem overlays pesados, sem ornamentos.
 * SEM fetch próprio — consome WeddingContext + useHeroMedia.
 */
const HeroMinimal = () => {
  const { wedding, weddingId } = useWedding();
  const { mainPhoto } = useHeroMedia(weddingId);

  if (!wedding) {
    return (
      <section className="min-h-screen w-full bg-background flex items-center">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 px-6 py-20">
          <Skeleton className="w-full aspect-[4/5] md:aspect-auto md:h-[70vh]" />
          <div className="space-y-6 self-center">
            <SkeletonText variant="heading" />
            <Skeleton className="h-px w-24" />
            <SkeletonText variant="body" />
          </div>
        </div>
      </section>
    );
  }

  const title = formatEventTitle(wedding, "Nosso Evento");
  const dateLabel = format(
    new Date(wedding.wedding_date + "T00:00:00"),
    "dd 'de' MMMM 'de' yyyy",
    { locale: ptBR }
  );

  const handleRsvp = () => {
    const target =
      document.getElementById("confirmados") ??
      document.getElementById("cronograma") ??
      document.querySelector("main > section:nth-of-type(2)");
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-5rem)]">
        {/* Imagem */}
        <div className="relative w-full aspect-[4/5] md:aspect-auto md:h-full bg-muted overflow-hidden">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={title}
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex items-center justify-center px-6 py-16 md:px-16 md:py-24">
          <div className="w-full max-w-md animate-fade-in-up">
            <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-muted-foreground mb-8">
              Save the date
            </p>

            <h1
              className="font-sans font-light tracking-tight text-foreground text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05]"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}
            >
              {title}
            </h1>

            <div className="my-8 h-px w-16 bg-border" />

            <p
              className="font-sans text-sm md:text-base uppercase tracking-[0.22em] text-foreground/80"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {dateLabel}
            </p>

            {wedding.venue_name && (
              <p
                className="mt-3 font-sans text-xs md:text-sm uppercase tracking-[0.18em] text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {wedding.venue_name}
              </p>
            )}

            <div className="mt-12">
              <Button
                onClick={handleRsvp}
                variant="outline"
                className="rounded-none border-foreground/80 text-foreground hover:bg-foreground hover:text-background h-12 px-8 text-xs uppercase tracking-[0.3em] font-normal"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Ver detalhes do evento
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroMinimal;
