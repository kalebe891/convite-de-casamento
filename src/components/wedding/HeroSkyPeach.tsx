import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { Button } from "@/components/ui/button";
import { formatEventTitle } from "@/lib/eventType";
import { useWedding } from "@/contexts/WeddingContext";
import { useHeroMedia } from "@/hooks/useHeroMedia";

/**
 * HeroSkyPeach — Hero exclusivo do tema "sky-peach".
 *
 * Desktop: split 50/50 (conteúdo à esquerda, foto à direita), altura total da viewport.
 * Mobile: empilhado verticalmente (foto acima, conteúdo abaixo).
 * Elementos exclusivos: blobs orgânicos translúcidos e arcos suaves (CSS + SVG inline).
 */
const HeroSkyPeach = () => {
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

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-background">
      {/* Blobs orgânicos translúcidos — CSS puro */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.35), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.45), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/4 h-[260px] w-[260px] rounded-full opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
      />

      {/* SVG inline — nuvens / arcos sutis no topo */}
      <svg
        aria-hidden
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="absolute top-0 left-0 right-0 w-full h-24 md:h-32 text-[hsl(var(--primary))] opacity-25"
      >
        <path
          d="M0,120 C200,40 400,180 600,120 C800,60 1000,160 1200,100 L1200,0 L0,0 Z"
          fill="currentColor"
          opacity="0.35"
        />
        <path
          d="M0,160 C220,80 460,180 720,140 C920,110 1080,170 1200,140 L1200,0 L0,0 Z"
          fill="currentColor"
          opacity="0.2"
        />
      </svg>

      <div className="relative z-10 grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Foto (mobile: topo / desktop: direita) */}
        <div className="relative order-1 md:order-2 h-[55vh] md:h-screen overflow-hidden">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={title}
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary) / 0.35), hsl(var(--accent) / 0.45))",
              }}
            />
          )}
          {/* Arco orgânico suave */}
          <div
            aria-hidden
            className="absolute inset-y-0 -left-12 hidden md:block w-24 bg-[hsl(var(--background))]"
            style={{ borderTopRightRadius: "50%", borderBottomRightRadius: "50%" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-10 left-0 right-0 h-20 md:hidden bg-[hsl(var(--background))]"
            style={{ borderTopLeftRadius: "50%", borderTopRightRadius: "50%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)/0.35)] via-transparent to-transparent" />
        </div>

        {/* Conteúdo (mobile: abaixo / desktop: esquerda) */}
        <div className="order-2 md:order-1 flex items-center justify-center px-6 py-16 md:px-12 md:py-0">
          <div className="max-w-lg w-full space-y-7">
            <p
              className="text-[10px] uppercase tracking-[0.45em] text-[hsl(var(--primary))]"
              style={{ fontFamily: "'Figtree', sans-serif" }}
            >
              Save the date
            </p>

            <h1
              className="leading-[1.02] tracking-tight text-foreground text-[clamp(2.5rem,6.5vw,5rem)]"
              style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}
            >
              {title}
            </h1>

            <div className="flex items-center gap-3 text-[hsl(var(--primary))]">
              <span className="h-px w-10 bg-current opacity-70" />
              <span
                className="h-1.5 w-1.5 rounded-full bg-current"
                aria-hidden
              />
              <span className="h-px w-10 bg-current opacity-70" />
            </div>

            <div
              className="space-y-1.5 text-foreground/85"
              style={{ fontFamily: "'Figtree', sans-serif" }}
            >
              <p className="text-base md:text-lg">{dateLabel}</p>
              {wedding.venue_name && (
                <p className="text-sm md:text-base text-muted-foreground">
                  {wedding.venue_name}
                </p>
              )}
            </div>

            <div className="pt-3">
              <Button
                onClick={handleRsvp}
                className="rounded-full h-12 px-10 text-xs uppercase tracking-[0.28em] font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 shadow-soft"
                style={{ fontFamily: "'Figtree', sans-serif" }}
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

export default HeroSkyPeach;
