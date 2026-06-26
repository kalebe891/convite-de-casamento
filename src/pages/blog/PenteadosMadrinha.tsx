import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Sparkles, Heart, Crown, Flower2, Scissors, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import SEO, { SITE_URL } from "@/components/seo/SEO";

const styles = [
  {
    Icon: Crown,
    title: "Coque baixo elegante",
    description:
      "O queridinho dos casamentos clássicos. Funciona em cerimônias diurnas e noturnas, harmoniza com vestidos de qualquer decote e ajuda a destacar brincos statement.",
    tips: [
      "Ideal para cabelos lisos, ondulados ou cacheados alisados na escova",
      "Combine com véu curto ou tiara discreta",
      "Use spray fixador leve para manter o brilho",
    ],
  },
  {
    Icon: Flower2,
    title: "Semipreso com ondas naturais",
    description:
      "Versátil e romântico, o semipreso solta o cabelo na medida certa. É a escolha perfeita para madrinhas que querem um look sofisticado sem perder a leveza.",
    tips: [
      "Use babyliss de 25mm para ondas marcadas e duradouras",
      "Aplique mousse antes de modelar para definir textura",
      "Acessórios florais valorizam casamentos ao ar livre",
    ],
  },
  {
    Icon: Sparkles,
    title: "Trança lateral embutida",
    description:
      "Para cerimônias boho, na praia ou no campo, a trança lateral traz movimento e personalidade. Combina muito com vestidos fluidos e tecidos leves.",
    tips: [
      "Funciona melhor em cabelos longos ou médios",
      "Deixe alguns fios soltos para suavizar o rosto",
      "Aplique óleo capilar nas pontas para finalizar",
    ],
  },
  {
    Icon: Scissors,
    title: "Cabelo solto com volume",
    description:
      "A escolha mais natural e moderna. Cabelos soltos modelados pedem cuidado extra com hidratação e finalização para parecerem impecáveis o dia todo.",
    tips: [
      "Faça uma hidratação profunda 2 dias antes",
      "Modele com escova rotativa ou babyliss",
      "Reaplique spray brilho antes das fotos",
    ],
  },
  {
    Icon: Heart,
    title: "Penteado preso com tiara",
    description:
      "Sofisticado e atemporal, o preso com tiara funciona muito bem em casamentos formais, à noite ou em igrejas tradicionais.",
    tips: [
      "Escolha tiara que combine com a cor do vestido",
      "Mantenha a maquiagem mais clean para equilibrar",
      "Peça ao cabeleireiro para testar o penteado antes do dia",
    ],
  },
  {
    Icon: Crown,
    title: "Rabo de cavalo alto chique",
    description:
      "Tendência das passarelas que chegou aos casamentos. Alonga o pescoço, valoriza brincos e é prático para dançar a noite inteira sem desmanchar.",
    tips: [
      "Ideal para vestidos com decote nas costas",
      "Use uma mecha do próprio cabelo para esconder o elástico",
      "Aplique gel modelador para um acabamento polido",
    ],
  },
];

const faceShapes = [
  {
    title: "Rosto oval",
    text: "Praticamente qualquer penteado funciona. Aproveite e ouse com semipresos, coques altos ou cabelos soltos com franja lateral.",
  },
  {
    title: "Rosto redondo",
    text: "Prefira penteados com altura no topo (coques altos, rabos altos) e evite volume nas laterais.",
  },
  {
    title: "Rosto alongado",
    text: "Penteados com volume nas laterais e ondas suaves equilibram as proporções. Franjas também ajudam.",
  },
  {
    title: "Rosto quadrado",
    text: "Ondas soltas, semipresos e penteados assimétricos suavizam os ângulos do rosto.",
  },
];

const checklist = [
  "Marque um teste de penteado pelo menos 30 dias antes do casamento",
  "Leve fotos de referência e acessórios reais (tiara, presilhas, véu)",
  "Combine o penteado com o estilo do vestido e o decote",
  "Considere o clima e o local (praia, campo, salão fechado)",
  "Hidrate o cabelo nas semanas anteriores e evite química na véspera",
  "No dia, lave o cabelo na noite anterior para facilitar a fixação",
];

const PenteadosMadrinha = () => {
  const path = "/blog/penteados-madrinha";
  const url = `${SITE_URL}${path}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Penteados para madrinha de casamento: 6 estilos que estão em alta",
    description:
      "Guia completo de penteados para madrinhas: coque, semipreso, trança, cabelo solto e mais. Dicas por formato de rosto e checklist para o grande dia.",
    image: `${SITE_URL}/pwa-512x512.png`,
    author: { "@type": "Organization", name: "Convites Digitais" },
    publisher: {
      "@type": "Organization",
      name: "Convites Digitais",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/pwa-512x512.png` },
    },
    mainEntityOfPage: url,
    datePublished: "2026-06-26",
    inLanguage: "pt-BR",
  };

  return (
    <div className="marketing-theme min-h-screen bg-background text-foreground">
      <SEO
        title="Penteados para Madrinha de Casamento: 6 Estilos em Alta"
        description="Guia completo de penteados para madrinha: coque baixo, semipreso, trança lateral, cabelo solto, tiara e rabo alto. Dicas por formato de rosto e checklist."
        path={path}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <MarketingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" aria-hidden />
        <div className="container relative mx-auto px-4 py-16 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Guia de beleza · Casamento
            </span>
            <h1 className="mt-6 font-serif text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Penteados para madrinha de casamento: 6 estilos em alta
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Inspiração, dicas práticas e um checklist completo para você escolher o penteado perfeito —
              do clássico coque baixo ao rabo alto chique.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Atualizado em Junho de 2026 · Leitura de 6 minutos
            </p>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ser madrinha é uma honra — e escolher o penteado certo é parte importante de compor um look
            que valorize você sem competir com a noiva. Reunimos os <strong>6 penteados para madrinha
            de casamento</strong> mais pedidos em salões brasileiros em 2026, com dicas de finalização,
            recomendações por formato de rosto e um checklist para você chegar tranquila ao grande dia.
          </p>
        </div>
      </section>

      {/* ESTILOS */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Inspiração</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            6 estilos que estão em alta
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl gap-5 sm:gap-6 md:grid-cols-2">
          {styles.map(({ Icon, title, description, tips }) => (
            <article
              key={title}
              className="rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft sm:p-8"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-serif text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
              <ul className="mt-5 space-y-2">
                {tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* POR FORMATO DE ROSTO */}
      <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Por formato de rosto</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Como escolher o penteado ideal
            </h2>
            <p className="mt-4 text-muted-foreground">
              O formato do rosto é o melhor ponto de partida para acertar na escolha.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            {faceShapes.map(({ title, text }) => (
              <div key={title} className="rounded-2xl border border-border/60 bg-card p-7">
                <h3 className="font-serif text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHECKLIST */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Checklist</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Antes do grande dia
            </h2>
          </div>
          <ul className="mt-8 space-y-3 rounded-2xl border border-border/60 bg-card p-7 sm:p-8">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm sm:text-base">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-hero p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <h2 className="relative font-serif text-2xl font-semibold leading-tight md:text-4xl">
            Está organizando seu casamento?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
            Crie um convite digital elegante, gerencie confirmações e sua lista de presentes em um único
            painel — sem taxas ocultas sobre os presentes.
          </p>
          <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/casamento">
              <Button size="lg" className="group w-full sm:w-auto">
                Conhecer a plataforma
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default PenteadosMadrinha;
