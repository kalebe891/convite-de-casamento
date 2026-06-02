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

  // Quando há foto, o conteúdo fica sobre overlay escuro → forçar texto claro
  // independente do modo (light/dark). Sem foto, segue tokens do tema.
  const hasPhoto = !!mainPhoto;
  const textBase = hasPhoto ? "text-white" : "text-foreground";
  const accent = hasPhoto ? "text-white/85" : "text-foreground/80";
  const accentSoft = hasPhoto ? "text-white/70" : "text-foreground/65";
  const divider = hasPhoto ? "bg-white/60" : "bg-primary/70";

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {hasPhoto && (
        <div
          className="absolute inset-0 bg-cover bg-center animate-fade-in"
          style={{ backgroundImage: `url(${mainPhoto})` }}
          aria-hidden
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-6xl px-6 text-center animate-fade-in-up">
        <p className={`font-sans text-[10px] sm:text-sm uppercase tracking-[0.3em] sm:tracking-[0.45em] mb-6 sm:mb-8 ${accent}`}>
          Save the date
        </p>

        <h1
          className={`font-serif font-light tracking-tight break-words leading-[0.95] text-[clamp(2.75rem,11vw,10rem)] ${textBase}`}
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {title}
        </h1>

        <div className={`mx-auto my-6 sm:my-8 h-px w-20 sm:w-24 ${divider}`} />

        <p
          className={`font-sans text-xs sm:text-base md:text-lg tracking-[0.18em] sm:tracking-[0.3em] uppercase ${accent}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {dateLabel}
        </p>

        {wedding.venue_name && (
          <p
            className={`mt-3 font-sans text-[11px] sm:text-sm tracking-[0.15em] sm:tracking-[0.25em] uppercase ${accentSoft}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {wedding.venue_name}
          </p>
        )}

        <div className="mt-10 sm:mt-12">
          <CountdownTimer
            targetDate={wedding.wedding_date}
            firstEventTime={firstEventTime}
          />
        </div>
      </div>

      <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-10">
        <div className={`w-px h-10 sm:h-12 animate-pulse ${divider}`} />
      </div>
    </section>
  );
};

export default HeroEditorial;
