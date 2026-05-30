import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Cake,
  Sparkles,
  CheckCircle2,
  Users,
  Gift,
  Calendar,
  MapPin,
  Camera,
  ShieldCheck,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const products = [
  {
    to: "/casamento",
    Icon: Heart,
    eyebrow: "Para noivos",
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

const features = [
  { Icon: Users, title: "Gestão de convidados", text: "Importe, organize por grupos e acompanhe confirmações em tempo real." },
  { Icon: CheckCircle2, title: "RSVP digital", text: "Confirmação simples no celular, com lembrete automático por WhatsApp." },
  { Icon: Gift, title: "Lista de presentes", text: "Cotas, presentes únicos e PIX integrado em uma experiência única." },
  { Icon: Calendar, title: "Cronograma do dia", text: "Programação detalhada acessível para convidados e fornecedores." },
  { Icon: MapPin, title: "Localização", text: "Mapa interativo, rotas e instruções claras para chegar ao evento." },
  { Icon: Camera, title: "Galeria de momentos", text: "Receba e exiba fotos dos convidados em uma galeria curada." },
];

const benefits = [
  { Icon: Sparkles, title: "Experiência premium", text: "Design editorial sob medida — sem cara de template." },
  { Icon: ShieldCheck, title: "Privacidade e controle", text: "Cada evento em ambiente isolado, com perfis e permissões." },
  { Icon: Smartphone, title: "Mobile-first", text: "Tudo otimizado para o celular dos convidados." },
];

const steps = [
  { n: "01", title: "Crie seu convite", text: "Personalize textos, fotos e cores em poucos minutos." },
  { n: "02", title: "Compartilhe", text: "Envie o link aos convidados e acompanhe RSVPs em tempo real." },
  { n: "03", title: "Receba no grande dia", text: "Use o check-in, cronograma e relatórios diretamente no celular." },
];

const LandingHome = () => {
  return (
    <div className="marketing-theme min-h-screen bg-background text-foreground">
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
              Convites digitais com a sofisticação que o seu evento merece.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Uma experiência completa para criar convites, confirmar presenças, organizar presentes e gerenciar
              todos os detalhes do seu evento em um só lugar.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <Link to="/casamento" className="sm:w-auto">
                <Button size="lg" className="group w-full sm:w-auto">
                  Convite de casamento
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/aniversario" className="sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Convite de aniversário
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Sem instalação · Acesso via celular · Pronto em minutos
            </p>
          </div>
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Soluções</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Um produto para cada celebração
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece pelo casamento — em breve, novas categorias para festejar cada momento importante.
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
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="border-y border-border/40 bg-muted/30 py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Recursos</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Tudo o que você precisa em um único painel
            </h2>
            <p className="mt-4 text-muted-foreground">
              Recursos pensados para hosts, cerimonialistas e convidados — com a estética de um convite impresso e
              a praticidade de um app moderno.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.map(({ Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Por que escolher</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Sofisticação, simplicidade e controle total.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pensado para quem quer surpreender os convidados sem abrir mão da praticidade. Uma plataforma robusta,
              com a delicadeza necessária para celebrar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/casamento">
                <Button size="lg" className="w-full sm:w-auto">Começar pelo casamento</Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {benefits.map(({ Icon, title, text }) => (
              <div
                key={title}
                className="flex gap-4 rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-border/40 bg-muted/30 py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Como funciona</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">Três passos para começar</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 sm:gap-6 md:grid-cols-3">
            {steps.map(({ n, title, text }) => (
              <div key={n} className="rounded-2xl border border-border/60 bg-card p-7 transition-colors hover:border-primary/40 sm:p-8">
                <span className="font-serif text-4xl text-primary">{n}</span>
                <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
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
            Comece agora e tenha tudo pronto antes do que você imagina.
          </p>
          <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/casamento">
              <Button size="lg" className="group w-full sm:w-auto">
                Criar convite de casamento
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
