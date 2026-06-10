import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Cake,
  Sparkles,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  FileSpreadsheet,
  Smartphone,
  ArrowRight,
  Wallet,
  Percent,
  LayoutDashboard,
} from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import SEO from "@/components/seo/SEO";

const products = [
  {
    to: "/casamento",
    Icon: Heart,
    eyebrow: "Disponível",
    title: "Casamento",
    description:
      "Convite digital completo com RSVP, lista de presentes, cronograma, painel administrativo e check-in no dia.",
    cta: "Explorar casamento",
    available: true,
  },
  {
    to: "/aniversario",
    Icon: Cake,
    eyebrow: "Em breve",
    title: "Aniversário",
    description:
      "Celebre datas marcantes com convites elegantes, gestão de presentes e confirmação de presença simplificada.",
    cta: "Saber mais",
    available: false,
  },
];

const gestaoItems = [
  {
    Icon: LayoutDashboard,
    title: "Centralize confirmações",
    text: "Acompanhe RSVPs em um painel único, sem depender de planilhas.",
  },
  {
    Icon: UserCheck,
    title: "Controle visual de acompanhantes",
    text: "Veja exatamente quem confirmou em tempo real.",
  },
  {
    Icon: Users,
    title: "Gestão sem fricção",
    text: "Gestão de usuário com permissões definidas, por exemplo: cerimonialistas.",
  },
];

const comparativo = [
  {
    label: "Modelo tradicional",
    border: "border-border/60",
    bg: "bg-card",
    icon: XCircle,
    iconColor: "text-muted-foreground",
    headline: "Algumas plataformas compensam a gratuidade cobrando taxas sobre presentes ou transferências.",
    points: [
      { ok: false, text: "Taxas sobre cada presente recebido" },
      { ok: false, text: "Intermediários no pagamento" },
      { ok: false, text: "Custo oculto repassado ao convidado" },
    ],
  },
  {
    label: "Nosso modelo",
    border: "border-primary/40",
    bg: "bg-primary/5",
    icon: CheckCircle2,
    iconColor: "text-primary",
    headline: "Taxa única de utilização. 100% do valor dos presentes vai direto para você, sem intermediários. Zero comissões ocultas.",
    points: [
      { ok: true, text: "Taxa única de utilização" },
      { ok: true, text: "Sem comissão sobre presentes" },
      { ok: true, text: "Transparência desde o início" },
      { ok: true, text: "Acesso garantido por 365 dias (renovável)" },
    ],
  },
];

const LandingHome = () => {
  return (
    <div className="marketing-theme min-h-screen bg-background text-foreground">
      <SEO
        title="Convites Digitais Premium e Gestão Inteligente"
        description="Plataforma premium para criar convites digitais com RSVP, lista de presentes sem taxas, cronograma e painel administrativo."
        path="/"
      />
      <MarketingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden />
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="container relative mx-auto px-4 py-20 sm:py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma premium de convites digitais
            </span>
            <h1 className="mt-6 font-serif text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Convites digitais premium e gestão inteligente para o seu evento.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
              A plataforma que substitui as gráficas, elimina as taxas sobre seus presentes e centraliza confirmações e gestão de convidados em um único painel.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <Link to="/casamento" className="sm:w-auto">
                <Button size="lg" className="group w-full sm:w-auto">
                  Criar meu convite
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a
                href="#produtos"
                className="sm:w-auto"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("produtos")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver temas
                </Button>
              </a>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Sem instalação · Acesso via celular · Pronto em minutos
            </p>
          </div>
        </div>
      </section>

      {/* GESTÃO — O FIM DAS PLANILHAS */}
      <section id="gestao" className="border-t border-border/40 bg-muted/30 py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Gestão</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Abandone as planilhas.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Não dependa de planilhas confusas e mensagens no WhatsApp para saber quem vai ao seu evento.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 md:grid-cols-3">
            {gestaoItems.map(({ Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft sm:p-8"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPARÊNCIA FINANCEIRA */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Transparência</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Sem taxas ocultas sobre seus presentes.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Compare como funciona e veja por que nosso modelo é diferente.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {comparativo.map(({ label, border, bg, icon: Icon, iconColor, headline, points }) => (
            <div
              key={label}
              className={`rounded-2xl border ${border} ${bg} p-7 sm:p-8`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${iconColor}`} />
                <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {label}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{headline}</p>
              <ul className="mt-6 space-y-3">
                {points.map(({ ok, text }, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    {ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                    )}
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* MULTI-EVENTO */}
      <section id="produtos" className="border-t border-border/40 bg-muted/30 py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Soluções</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Um produto para cada celebração
            </h2>
            <p className="mt-4 text-muted-foreground">
              Casamentos e aniversários. Cada evento com a mesma sofisticação e controle total.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 sm:gap-6 md:grid-cols-2">
            {products.map(({ to, Icon, eyebrow, title, description, cta, available }) => (
              <Link
                key={title}
                to={to}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elegant sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-border/60 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {eyebrow}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                {!available && (
                  <span className="absolute right-6 top-6 hidden text-[10px] uppercase tracking-wider text-muted-foreground" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-hero p-8 text-center sm:p-10 md:p-16">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <h2 className="relative font-serif text-3xl font-semibold leading-tight md:text-5xl">
            Pronto para criar um convite memorável?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
            Fale com nossa equipe para garantir sua licença, escolher seu tema e começar a personalizar os detalhes do seu evento.
          </p>
          <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/casamento">
              <Button size="lg" className="group w-full sm:w-auto">
                Criar convite
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Já tenho conta</Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default LandingHome;
