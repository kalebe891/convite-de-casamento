import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_TENANT_EVENT_TYPE,
  DEMO_TENANT_SLUG,
} from "@/lib/themePreviewWhitelist";
import ThemeShowcaseCard, {
  ArtDecoPreview,
  BohoPreview,
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
      "O tema original. Romântico, centralizado e atemporal — ideal para convites clássicos.",
    features: [
      "Hero centralizado com moldura romântica",
      "Blocos clássicos e ritmo tradicional",
      "Paleta suave e tipografia serifada",
    ],
    Preview: LegacyPreview,
  },
  {
    id: "editorial",
    name: "Editorial",
    description:
      "Estética de revista: hero full-bleed, tipografia oversized e respiro fotográfico.",
    features: [
      "Hero full-bleed com overlay fotográfico",
      "Tipografia oversized e contraste alto",
      "Ritmo editorial e composições amplas",
    ],
    Preview: EditorialPreview,
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Composição limpa em split 50/50, com linhas finas e uso generoso de espaços em branco.",
    features: [
      "Layout split 50/50",
      "Linhas finas e grande área em branco",
      "Foco absoluto na tipografia",
    ],
    Preview: MinimalPreview,
  },
  {
    id: "modern-noir",
    name: "Modern Noir",
    description:
      "Cinematográfico e sofisticado. Fundo escuro, contraste elevado e contador regressivo.",
    features: [
      "Hero escuro full-screen no desktop",
      "Contraste elevado e elementos cinematográficos",
      "Countdown integrado",
    ],
    Preview: ModernNoirPreview,
  },
  {
    id: "art-deco",
    name: "Art Deco",
    description:
      "Luxo geométrico inspirado nos anos 20. Molduras douradas, simetria e detalhes ornamentais.",
    features: [
      "Linhas geométricas e simetria visual",
      "Molduras douradas em camadas",
      "Tipografia serifada e ornamentos inline",
    ],
    Preview: ArtDecoPreview,
  },
  {
    id: "boho",
    name: "Boho",
    description:
      "Orgânico, acolhedor e artesanal. Tons terrosos, ramos delicados e composição natural.",
    features: [
      "Hero centralizado com foto em background",
      "Paleta terrosa e tipografia Lora",
      "Ramos e separadores naturais em SVG inline",
    ],
    Preview: BohoPreview,
  },
  {
    id: "sky-peach",
    name: "Sky & Peach",
    description:
      "Sonhador e contemporâneo. Azul celeste com toques pêssego, composição leve e arejada.",
    features: [
      "Hero split 50/50 (foto + conteúdo)",
      "Blobs orgânicos e arcos suaves em CSS",
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
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Estilos</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Escolha o estilo do seu convite
          </h2>
          <p className="mt-4 text-muted-foreground">
            Seis temas exclusivos, cada um com personalidade própria.
            Visualize ao vivo antes de decidir.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((theme) => (
            <ThemeShowcaseCard
              key={theme.id}
              theme={theme}
              previewUrl={demoExists ? buildPreviewUrl(theme.id) : null}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThemesShowcaseSection;
