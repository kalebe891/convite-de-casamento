import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_TENANT_EVENT_TYPE,
  DEMO_TENANT_SLUG,
} from "@/lib/themePreviewWhitelist";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ThemeShowcaseCard, {
  ArtDecoPreview,
  EditorialPreview,
  LegacyPreview,
  MinimalPreview,
  ModernNoirPreview,
  SkyPeachPreview,
  type ThemeShowcaseItem,
} from "./ThemeShowcaseCard";

const THEMES: ThemeShowcaseItem[] = [
  {
    id: "legacy",
    name: "Legacy",
    description:
      "Convite clássico e atemporal, com hero centralizado e tipografia serifada.",
    features: [
      "Layout centralizado e simétrico",
      "Paleta neutra e elegante",
      "Ideal para cerimônias tradicionais",
    ],
    Preview: LegacyPreview,
  },
  {
    id: "editorial",
    name: "Editorial",
    description:
      "Estética de revista com hero full-bleed e tipografia em grande escala.",
    features: [
      "Hero full-bleed com overlay fotográfico",
      "Tipografia oversized e alto contraste",
      "Pensado para fotos marcantes",
    ],
    Preview: EditorialPreview,
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Composição limpa em split 50/50, com bastante respiro e foco na tipografia.",
    features: [
      "Layout split 50/50",
      "Espaço em branco generoso",
      "Visual moderno e sóbrio",
    ],
    Preview: MinimalPreview,
  },
  {
    id: "modern-noir",
    name: "Modern Noir",
    description:
      "Visual cinematográfico em fundo escuro, com contador regressivo integrado.",
    features: [
      "Hero escuro full-screen",
      "Contraste alto e ar cinematográfico",
      "Countdown nativo até o evento",
    ],
    Preview: ModernNoirPreview,
  },
  {
    id: "art-deco",
    name: "Art Deco",
    description:
      "Luxo geométrico inspirado nos anos 20, com molduras douradas e simetria.",
    features: [
      "Molduras douradas em camadas",
      "Simetria e ornamentos geométricos",
      "Indicado para celebrações formais",
    ],
    Preview: ArtDecoPreview,
  },
  {
    id: "sky-peach",
    name: "Sky & Peach",
    description:
      "Paleta azul celeste com toques pêssego, composição leve e contemporânea.",
    features: [
      "Hero split com foto + conteúdo",
      "Formas orgânicas e arcos suaves",
      "Tipografia Outfit + Figtree",
    ],
    Preview: SkyPeachPreview,
  },
];

const buildPreviewUrl = (themeId: string) =>
  `/${DEMO_TENANT_EVENT_TYPE}/${DEMO_TENANT_SLUG}?theme=${themeId}`;

const ThemesShowcaseSection = () => {
  const [demoExists, setDemoExists] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("wedding_details")
          .select("slug")
          .eq("slug", DEMO_TENANT_SLUG)
          .maybeSingle();
        if (!active) return;
        setDemoExists(!error && !!data);
      } catch {
        if (active) setDemoExists(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="temas"
      className="border-t border-border/40 bg-muted/20 py-16 sm:py-20 md:py-28"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Temas</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Escolha o estilo do seu convite
          </h2>
          <p className="mt-4 text-muted-foreground">
            Seis temas prontos para personalizar. Visualize cada um em uma demonstração real antes de decidir.
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <Carousel
            opts={{ align: "start", loop: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-4 sm:-ml-5">
              {THEMES.map((theme) => (
                <CarouselItem
                  key={theme.id}
                  className="pl-4 sm:pl-5 basis-full md:basis-1/2 lg:basis-1/4"
                >
                  <ThemeShowcaseCard
                    theme={theme}
                    previewUrl={demoExists ? buildPreviewUrl(theme.id) : null}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 lg:-left-6" />
            <CarouselNext className="hidden md:flex -right-4 lg:-right-6" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default ThemesShowcaseSection;
