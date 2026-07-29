import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { Button } from "@/components/ui/button";
import { formatEventTitle } from "@/lib/eventType";
import { useWedding } from "@/contexts/WeddingContext";
import { useHeroMedia } from "@/hooks/useHeroMedia";

/**
 * HeroArtDeco — Hero exclusivo do tema "art-deco".
 *
 * Desktop: foto centralizada com moldura geométrica, nomes em grande destaque,
 * linhas douradas e separadores simétricos via CSS e SVG inline.
 * Mobile: layout simplificado com elementos geométricos preservados.
 */
const HeroArtDeco = () => {
  const { wedding, weddingId } = useWedding();
  const { mainPhoto } = useHeroMedia(weddingId);

  if (!wedding) {
    return (
      <section className="min-h-screen w-full bg-background flex items-center">
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
    <section className="relative w-full bg-background overflow-hidden">
      {/* Linhas decorativas geométricas superior — Art Deco */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent opacity-60" />
      <div className="absolute top-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent opacity-30" />

      <div className="container mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          {/* Separador superior Art Deco — SVG inline geométrico */}
          <div className="mb-8 w-full max-w-xs">
            <svg viewBox="0 0 320 24" fill="none" className="w-full h-6" aria-hidden="true">
              <line x1="0" y1="12" x2="130" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.35" />
              <line x1="190" y1="12" x2="320" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.35" />
              <rect x="148" y="4" width="24" height="16" rx="0" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <rect x="152" y="8" width="16" height="8" rx="0" fill="currentColor" opacity="0.2" />
            </svg>
          </div>

          <p
            className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Save the date
          </p>

          {/* Nomes em grande destaque — Playfair Display */}
          <h1
            className="leading-[0.95] tracking-tight text-foreground text-[clamp(2.5rem,6.5vw,5rem)]"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            {title}
          </h1>

          {/* Separador horizontal dourado com pontas geométricas */}
          <div className="my-8 w-full max-w-[14rem] flex items-center gap-3">
            <div className="flex-1 h-px bg-[hsl(var(--primary))] opacity-50" />
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0" aria-hidden="true">
              <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" className="text-[hsl(var(--primary))] opacity-60" />
              <rect x="5" y="5" width="6" height="6" fill="currentColor" className="text-[hsl(var(--primary))] opacity-25" />
            </svg>
            <div className="flex-1 h-px bg-[hsl(var(--primary))] opacity-50" />
          </div>

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

          {/* Foto principal com moldura geométrica Art Deco */}
          <div className="mt-12 w-full max-w-lg relative">
            {/* Moldura externa — linhas geométricas CSS */}
            <div className="absolute -inset-3 border border-[hsl(var(--primary))] opacity-25" />
            <div className="absolute -inset-1 border border-[hsl(var(--primary))] opacity-15" />
            {/* Cantos decorativos */}
            <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-[hsl(var(--primary))] opacity-50" />
            <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-[hsl(var(--primary))] opacity-50" />
            <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-[hsl(var(--primary))] opacity-50" />
            <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-[hsl(var(--primary))] opacity-50" />

            <div className="relative aspect-[4/5] md:aspect-[3/4] bg-muted overflow-hidden">
              {mainPhoto ? (
                <img
                  src={mainPhoto}
                  alt={title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              {/* Gradiente sutil na base da imagem para integração */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12">
            <Button
              onClick={handleRsvp}
              className="rounded-none h-12 px-10 text-xs uppercase tracking-[0.3em] font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Ver detalhes do evento
            </Button>
          </div>

          {/* Separador inferior Art Deco */}
          <div className="mt-12 w-full max-w-xs">
            <svg viewBox="0 0 320 24" fill="none" className="w-full h-6" aria-hidden="true">
              <line x1="0" y1="12" x2="130" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.35" />
              <line x1="190" y1="12" x2="320" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.35" />
              <rect x="148" y="4" width="24" height="16" rx="0" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <rect x="152" y="8" width="16" height="8" rx="0" fill="currentColor" opacity="0.2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Linhas decorativas inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent opacity-30" />
    </section>
  );
};

export default HeroArtDeco;
