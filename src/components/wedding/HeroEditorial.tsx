import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import CountdownTimer from "@/components/wedding/CountdownTimer";
import { formatEventTitle } from "@/lib/eventType";
import { useWedding } from "@/contexts/WeddingContext";
import { useHeroMedia } from "@/hooks/useHeroMedia";

/**
 * HeroEditorial — Variante visual estrutural do Hero para o tema "editorial".
 *
 * SEM lógica de fetch: consome dados via WeddingContext + hook compartilhado
 * `useHeroMedia`. Toda a obtenção de dados continua centralizada.
 *
 * Visual: foto do casal em background full-bleed com overlay escurecido,
 * nomes em tipografia serifada oversized e fina, data/local delicados abaixo.
 */
const HeroEditorial = () => {
  const { wedding, weddingId } = useWedding();
  const { mainPhoto, firstEventTime } = useHeroMedia(weddingId);

  if (!wedding) {
    return (
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-muted/30">
        <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-4 text-center">
          <SkeletonText variant="heading" className="mx-auto" />
          <Skeleton className="h-px w-32 mx-auto" />
          <SkeletonText variant="body" className="mx-auto" />
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

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {mainPhoto && (
        <div
          className="absolute inset-0 bg-cover bg-center animate-fade-in"
          style={{ backgroundImage: `url(${mainPhoto})` }}
          aria-hidden
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-6xl px-6 text-center animate-fade-in-up">
        <p className="font-sans text-xs sm:text-sm uppercase tracking-[0.45em] text-primary/90 mb-8">
          Save the date
        </p>

        <h1
          className="font-serif font-light tracking-tight text-foreground break-words leading-[0.95] text-[clamp(3.5rem,12vw,10rem)]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {title}
        </h1>

        <div className="mx-auto my-8 h-px w-24 bg-primary/70" />

        <p
          className="font-sans text-base sm:text-lg tracking-[0.3em] uppercase text-foreground/85"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {dateLabel}
        </p>

        {wedding.venue_name && (
          <p
            className="mt-3 font-sans text-sm tracking-[0.25em] uppercase text-foreground/70"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {wedding.venue_name}
          </p>
        )}

        <div className="mt-12">
          <CountdownTimer
            targetDate={wedding.wedding_date}
            firstEventTime={firstEventTime}
          />
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
        <div className="w-px h-12 bg-primary/60 animate-pulse" />
      </div>
    </section>
  );
};

export default HeroEditorial;
