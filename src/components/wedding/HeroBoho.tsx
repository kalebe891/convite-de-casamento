import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { Button } from "@/components/ui/button";
import { formatEventTitle } from "@/lib/eventType";
import { useWedding } from "@/contexts/WeddingContext";
import { useHeroMedia } from "@/hooks/useHeroMedia";

/**
 * HeroBoho — Hero exclusivo do tema "boho".
 *
 * Foto principal em background full-width, overlay quente e suave,
 * nomes centralizados, data/local acima, CTA abaixo e elementos
 * orgânicos (ramos, folhas, arcos) feitos com SVG inline + CSS.
 */
const HeroBoho = () => {
  const { wedding, weddingId } = useWedding();
  const { mainPhoto } = useHeroMedia(weddingId);

  if (!wedding) {
    return (
      <section className="min-h-[80vh] w-full bg-background flex items-center">
        <div className="container mx-auto px-6 py-20 space-y-6 max-w-2xl text-center">
          <SkeletonText variant="heading" />
          <Skeleton className="h-px w-24 mx-auto" />
          <SkeletonText variant="body" />
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

  // Ramo orgânico inline — SVG decorativo
  const BohoBranch = ({ className = "", flip = false }: { className?: string; flip?: boolean }) => (
    <svg
      viewBox="0 0 120 40"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    >
      <path
        d="M5 20 Q40 18 60 20 T115 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse cx="25" cy="14" rx="6" ry="2.4" fill="currentColor" opacity="0.5" transform="rotate(-25 25 14)" />
      <ellipse cx="35" cy="26" rx="6" ry="2.4" fill="currentColor" opacity="0.5" transform="rotate(25 35 26)" />
      <ellipse cx="50" cy="14" rx="6" ry="2.4" fill="currentColor" opacity="0.5" transform="rotate(-25 50 14)" />
      <ellipse cx="65" cy="26" rx="6" ry="2.4" fill="currentColor" opacity="0.5" transform="rotate(25 65 26)" />
      <ellipse cx="80" cy="14" rx="6" ry="2.4" fill="currentColor" opacity="0.5" transform="rotate(-25 80 14)" />
      <ellipse cx="95" cy="26" rx="6" ry="2.4" fill="currentColor" opacity="0.5" transform="rotate(25 95 26)" />
    </svg>
  );

  return (
    <section className="relative w-full min-h-[88vh] overflow-hidden bg-background">
      {/* Imagem de fundo full-width */}
      {mainPhoto ? (
        <img
          src={mainPhoto}
          alt={title}
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--accent)/0.25)]" />
      )}

      {/* Overlay quente — gradientes suaves */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background)/0.55)] via-[hsl(var(--background)/0.35)] to-[hsl(var(--background)/0.85)]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--primary)/0.18)] via-transparent to-[hsl(var(--accent)/0.18)] mix-blend-soft-light" />

      {/* Arco orgânico inferior — CSS puro */}
      <div
        aria-hidden
        className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-40 w-[140%] rounded-[50%] bg-[hsl(var(--background))] opacity-90"
      />

      <div className="relative z-10 container mx-auto px-6 py-20 md:py-28 min-h-[88vh] flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-3xl">
          {/* Data + local acima do nome */}
          <p
            className="text-[10px] uppercase tracking-[0.45em] text-[hsl(var(--primary))] mb-3"
            style={{ fontFamily: "'Lora', serif" }}
          >
            {dateLabel}
          </p>
          {wedding.venue_name && (
            <p
              className="text-xs md:text-sm uppercase tracking-[0.3em] text-foreground/75 mb-8"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {wedding.venue_name}
            </p>
          )}

          {/* Ramo decorativo superior */}
          <div className="text-[hsl(var(--primary))] mb-6 w-44 md:w-56">
            <BohoBranch className="w-full h-auto" />
          </div>

          {/* Nomes centralizados */}
          <h1
            className="leading-[1.05] tracking-tight text-foreground text-[clamp(2.75rem,7vw,5.5rem)]"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            {title}
          </h1>

          {/* Ramo decorativo inferior (espelhado) */}
          <div className="text-[hsl(var(--primary))] mt-6 w-44 md:w-56">
            <BohoBranch className="w-full h-auto" flip />
          </div>

          {/* CTA RSVP */}
          <div className="mt-10">
            <Button
              onClick={handleRsvp}
              className="rounded-full h-12 px-10 text-xs uppercase tracking-[0.28em] font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 shadow-soft"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Confirmar Presença
            </Button>
          </div>

          {/* Separador natural */}
          <div className="mt-12 flex items-center gap-3 text-[hsl(var(--primary))]">
            <span className="h-px w-10 bg-current opacity-60" />
            <svg viewBox="0 0 16 16" className="w-3 h-3" aria-hidden="true">
              <circle cx="8" cy="8" r="2.5" fill="currentColor" opacity="0.8" />
            </svg>
            <span className="h-px w-10 bg-current opacity-60" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBoho;
