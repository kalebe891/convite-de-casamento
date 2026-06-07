import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ThemeShowcaseItem {
  id: string;
  name: string;
  description: string;
  features: string[];
  Preview: React.ComponentType;
}

interface Props {
  theme: ThemeShowcaseItem;
  previewUrl: string | null;
}

const ThemeShowcaseCard = ({ theme, previewUrl }: Props) => {
  const { name, description, features, Preview } = theme;
  const disabled = !previewUrl;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.4)] bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border/40 bg-muted/30">
        <Preview />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Tema</p>
          <h3 className="mt-1 font-serif text-2xl font-semibold leading-tight">
            {name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <ul className="space-y-1.5">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          {disabled ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="w-full"
              title="Preview indisponível neste ambiente"
            >
              Preview indisponível
            </Button>
          ) : (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="group/btn w-full">
                Visualizar
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

/* -------------------------------------------------------------------------- */
/* Previews — wireframes abstratos (CSS + SVG inline, sem assets externos)    */
/* -------------------------------------------------------------------------- */

const Frame = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("absolute inset-0 flex items-center justify-center p-5", className)}>
    {children}
  </div>
);

export const LegacyPreview = () => (
  <Frame className="bg-gradient-to-br from-[hsl(var(--accent)/0.4)] to-[hsl(var(--primary)/0.08)]">
    <div className="relative flex h-full w-full max-w-[78%] flex-col items-center justify-center rounded-md border border-primary/30 bg-card/70 p-4 text-center shadow-sm">
      <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-primary/50" />
      <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-primary/50" />
      <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-primary/50" />
      <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-primary/50" />
      <p className="text-[8px] uppercase tracking-[0.25em] text-primary/70">Save the date</p>
      <div className="my-2 flex items-center gap-1.5 text-primary">
        <span className="h-px w-5 bg-primary/40" />
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current">
          <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
        </svg>
        <span className="h-px w-5 bg-primary/40" />
      </div>
      <p className="font-serif text-sm font-semibold">M <span className="italic text-primary">&</span> J</p>
      <div className="mt-2 h-1 w-12 rounded-full bg-muted-foreground/20" />
      <div className="mt-1 h-1 w-8 rounded-full bg-muted-foreground/20" />
    </div>
  </Frame>
);

export const EditorialPreview = () => (
  <Frame className="bg-[hsl(var(--foreground))] p-0">
    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.35)] via-transparent to-[hsl(var(--accent)/0.25)]" />
    <div className="absolute inset-0 flex flex-col justify-end p-5">
      <p className="text-[8px] uppercase tracking-[0.3em] text-background/70">Editorial</p>
      <p className="mt-1 font-serif text-2xl font-bold leading-none text-background">
        Maria
      </p>
      <p className="font-serif text-2xl italic leading-none text-background/90">
        & João
      </p>
      <div className="mt-3 h-px w-12 bg-background/50" />
    </div>
  </Frame>
);

export const MinimalPreview = () => (
  <Frame className="bg-background p-0">
    <div className="grid h-full w-full grid-cols-2">
      <div className="flex items-center justify-center border-r border-border/60">
        <div className="space-y-1.5 text-center">
          <p className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground">14.09</p>
          <div className="mx-auto h-px w-6 bg-foreground/40" />
          <p className="font-serif text-base">M & J</p>
        </div>
      </div>
      <div className="flex flex-col items-start justify-center gap-1.5 p-4">
        <div className="h-1 w-10 bg-foreground/20" />
        <div className="h-1 w-14 bg-foreground/20" />
        <div className="h-1 w-8 bg-foreground/20" />
        <div className="mt-2 h-4 w-12 border border-foreground/40" />
      </div>
    </div>
  </Frame>
);

export const ModernNoirPreview = () => (
  <Frame className="bg-[#0A0A1A] p-0">
    <div className="absolute inset-0 bg-gradient-to-tr from-black via-[#0A0A1A] to-[#1a1a2e]" />
    <div className="absolute left-5 top-1/2 -translate-y-1/2 space-y-2">
      <p className="text-[7px] uppercase tracking-[0.4em] text-white/50">Sept 14</p>
      <p className="text-[10px] font-light tracking-[0.2em] text-white">
        MARIA
      </p>
      <p className="text-[10px] font-light tracking-[0.2em] text-white/80">
        & JOÃO
      </p>
      <div className="h-px w-10 bg-white/40" />
      <p className="text-[7px] tracking-[0.2em] text-white/60">00 : 00 : 00</p>
    </div>
    <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-white/40" />
    <div className="absolute bottom-4 right-4 text-[7px] tracking-[0.3em] text-white/40">
      EST. 2026
    </div>
  </Frame>
);

export const ArtDecoPreview = () => (
  <Frame className="bg-[#F0EBE3] p-0">
    <div className="absolute inset-3 border-2 border-[#c9a84c]/70" />
    <div className="absolute inset-5 border border-[#c9a84c]/40" />
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 m-auto h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M50 12 L58 24 L50 36 L42 24 Z" fill="none" stroke="#c9a84c" strokeWidth="0.6" />
      <path d="M50 64 L58 76 L50 88 L42 76 Z" fill="none" stroke="#c9a84c" strokeWidth="0.6" />
    </svg>
    <div className="relative z-10 flex flex-col items-center gap-1 text-center">
      <p className="text-[7px] uppercase tracking-[0.4em] text-[#8b6f2a]">Celebration</p>
      <div className="flex items-center gap-1.5">
        <span className="h-px w-4 bg-[#c9a84c]" />
        <p className="font-serif text-base font-bold text-[#1a1a1a]">M &amp; J</p>
        <span className="h-px w-4 bg-[#c9a84c]" />
      </div>
      <p className="text-[7px] tracking-[0.3em] text-[#8b6f2a]">XIV · IX · MMXXVI</p>
    </div>
  </Frame>
);

export const BohoPreview = () => (
  <Frame className="bg-[#F5F0E8] p-0">
    <div className="absolute inset-0 bg-gradient-to-br from-[#F5F0E8] via-[#FAF6F0] to-[#D4A574]/35" />
    {/* Arco orgânico inferior */}
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-12 w-[140%] rounded-[50%] bg-[#F5F0E8]" />
    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
      {/* Ramo decorativo SVG inline */}
      <svg viewBox="0 0 100 24" className="w-20 text-[#8B7355]" aria-hidden>
        <path d="M5 12 Q30 10 50 12 T95 12" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.8" />
        <ellipse cx="22" cy="8" rx="4" ry="1.6" fill="currentColor" opacity="0.6" transform="rotate(-25 22 8)" />
        <ellipse cx="32" cy="16" rx="4" ry="1.6" fill="currentColor" opacity="0.6" transform="rotate(25 32 16)" />
        <ellipse cx="50" cy="8" rx="4" ry="1.6" fill="currentColor" opacity="0.6" transform="rotate(-25 50 8)" />
        <ellipse cx="68" cy="16" rx="4" ry="1.6" fill="currentColor" opacity="0.6" transform="rotate(25 68 16)" />
        <ellipse cx="80" cy="8" rx="4" ry="1.6" fill="currentColor" opacity="0.6" transform="rotate(-25 80 8)" />
      </svg>
      <p className="text-[7px] uppercase tracking-[0.4em] text-[#8B7355]">14 · 09 · 2026</p>
      <p className="font-serif text-base text-[#4A4036]">Maria &amp; João</p>
      <div className="flex items-center gap-1.5 text-[#8B7355]">
        <span className="h-px w-5 bg-current opacity-60" />
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-px w-5 bg-current opacity-60" />
      </div>
      <div className="mt-1 h-3.5 w-14 rounded-full bg-[#8B7355]" />
    </div>
  </Frame>
);

export default ThemeShowcaseCard;
