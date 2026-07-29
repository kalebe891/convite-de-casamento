import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { Button } from "@/components/ui/button";
import { formatEventTitle } from "@/lib/eventType";
import { useWedding } from "@/contexts/WeddingContext";
import { useHeroMedia } from "@/hooks/useHeroMedia";

/**
 * HeroModernNoir — Hero exclusivo do tema "modern-noir".
 *
 * Desktop: foto full-screen com overlay escuro, conteúdo alinhado à esquerda.
 * Mobile: foto no topo, conteúdo empilhado abaixo.
 * Inclui contador regressivo simples (dias restantes), calculado no render.
 */
const HeroModernNoir = () => {
  const { wedding, weddingId } = useWedding();
  const { mainPhoto } = useHeroMedia(weddingId);

  if (!wedding) {
    return (
      <section className="min-h-[calc(100vh-5rem)] w-full bg-background flex items-center">
        <div className="container mx-auto px-6 py-20 space-y-6 max-w-2xl">
          <SkeletonText variant="heading" />
          <Skeleton className="h-px w-24" />
          <SkeletonText variant="body" />
        </div>
      </section>
    );
  }

  const title = formatEventTitle(wedding, "Nosso Evento");
  const eventDate = new Date(wedding.wedding_date + "T00:00:00");
  const dateLabel = format(eventDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const daysLeft = Math.max(0, differenceInCalendarDays(eventDate, new Date()));

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
      {/* Mobile: imagem topo */}
      <div className="md:hidden relative w-full aspect-[4/5] bg-muted overflow-hidden">
        {mainPhoto ? (
          <img src={mainPhoto} alt={title} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      {/* Desktop: full-bleed background com overlay */}
      <div className="relative w-full md:min-h-[calc(100vh-5rem)] overflow-hidden">
        <div className="hidden md:block absolute inset-0">
          {mainPhoto ? (
            <img src={mainPhoto} alt={title} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/55 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        </div>

        <div className="relative container mx-auto px-6 py-16 md:py-24 md:min-h-[calc(100vh-5rem)] flex md:items-center">
          <div className="w-full max-w-2xl animate-fade-in-up">
            <p
              className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Save the date
            </p>

            <h1
              className="text-foreground leading-[0.95] tracking-tight text-[clamp(2.5rem,7vw,5.5rem)] font-bold"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
            >
              {title}
            </h1>

            <div className="my-8 h-px w-20 bg-foreground/40" />

            <p
              className="text-sm md:text-base uppercase tracking-[0.28em] text-foreground/85"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {dateLabel}
            </p>

            {wedding.venue_name && (
              <p
                className="mt-2 text-xs md:text-sm uppercase tracking-[0.22em] text-muted-foreground"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {wedding.venue_name}
              </p>
            )}

            {/* Contador regressivo discreto */}
            {daysLeft > 0 && (
              <div className="mt-10 inline-flex items-baseline gap-3 border-l-2 border-[hsl(var(--accent))] pl-4">
                <span
                  className="text-4xl md:text-5xl font-bold text-foreground tabular-nums leading-none"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {daysLeft}
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {daysLeft === 1 ? "dia restante" : "dias restantes"}
                </span>
              </div>
            )}

            <div className="mt-12">
              <Button
                onClick={handleRsvp}
                className="rounded-none h-12 px-10 text-xs uppercase tracking-[0.3em] font-medium bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-90"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
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

export default HeroModernNoir;
