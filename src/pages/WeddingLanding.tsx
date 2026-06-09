import { Button } from "@/components/ui/button";
import {
  Heart,
  Users,
  UsersRound,
  Gift,
  Calendar,
  Newspaper,
  CheckCircle2,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import ShowcaseSection from "@/components/marketing/ShowcaseSection";
import ThemesShowcaseSection from "@/components/marketing/ThemesShowcaseSection";
import SEO from "@/components/seo/SEO";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5562992485994&text=Olá,%20Quero%20criar%20o%20meu%20convite%20de%20casamento.&type=phone_number&app_absent=0";

const features = [
  {
    n: "01",
    Icon: CheckCircle2,
    title: "RSVP integrado",
    text: "Convidados confirmam presença pelo celular em poucos segundos.",
  },
  {
    n: "02",
    Icon: Users,
    title: "Gestão de convidados",
    text: "Cadastro, confirmações e check-in centralizados em um painel.",
  },
  {
    n: "03",
    Icon: Gift,
    title: "Lista de presentes",
    text: "Itens, cotas e PIX integrados, sem depender de outras plataformas.",
  },
  {
    n: "04",
    Icon: Calendar,
    title: "Cronograma do evento",
    text: "Programação clara para convidados, padrinhos e fornecedores.",
  },
  {
    n: "05",
    Icon: Newspaper,
    title: "Página personalizada",
    text: "Todas as informações do casamento em uma página elegante e responsiva.",
  },
  {
    n: "06",
    Icon: UsersRound,
    title: "Equipe e permissões",
    text: "Cerimonialistas e colaboradores com acessos controlados por papel.",
  },
];

const experience = [
  "Nomes dos noivos, data e local em destaque",
  "Confirmação de presença e check-in no dia",
  "Mensagens dos convidados em uma galeria dedicada",
  "Cronograma e localização sempre à mão",
];

const steps = [
  { n: "01", title: "Personalize", text: "Defina nomes, data, fotos e textos do convite." },
  { n: "02", title: "Compartilhe", text: "Envie o link aos convidados e acompanhe as confirmações." },
  { n: "03", title: "Celebre", text: "Use o painel e o check-in no dia do evento, sem complicação." },
];

const trustBadges = [
  { Icon: Sparkles, label: "Convite digital personalizado" },
  { Icon: CheckCircle2, label: "RSVP integrado" },
  { Icon: ShieldCheck, label: "Gestão inteligente de convidados" },
];

const WeddingLanding = () => {
  return (
    <div className="marketing-theme min-h-screen bg-background text-foreground">
      <SEO
        title="Convite de Casamento Digital | Página exclusiva, RSVP e presentes"
        description="Crie uma página de casamento exclusiva com RSVP integrado, lista de presentes e cronograma. Personalização rápida, visual elegante e gestão completa em um único painel."
        path="/casamento"
      />
      <MarketingHeader />

      {/* HERO EDITORIAL */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-elegant opacity-80" aria-hidden />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-[420px] w-[420px] rounded-full bg-accent/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />

        <div className="container relative mx-auto grid gap-12 px-4 py-16 sm:py-20 md:grid-cols-12 md:items-center md:gap-8 md:py-28">
          <div className="md:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/70 px-4 py-1.5 text-xs font-medium tracking-wide text-primary backdrop-blur">
              <Heart className="h-3.5 w-3.5" />
              Convite de casamento
            </span>
            <h1 className="mt-6 font-serif text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Páginas e convites digitais
              <br />
              feitos para o <em className="font-serif italic text-primary">seu casamento</em>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Uma plataforma completa para criar a página do casamento, enviar o convite, receber confirmações e
              organizar tudo em um único painel. Personalização rápida, visual elegante e gestão prática.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="group w-full sm:w-auto">
                  Falar no WhatsApp
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
              <a href="#temas">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">Ver opções</Button>
              </a>
            </div>
          </div>

          {/* mockup card */}
          <div className="md:col-span-5">
            <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
              <div className="absolute inset-0 -rotate-3 rounded-3xl bg-primary/10" aria-hidden />
              <div className="relative rounded-3xl border border-border/60 bg-card p-8 shadow-elegant">
                <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Save the date
                </p>
                <div className="my-6 flex items-center justify-center gap-3 text-primary">
                  <span className="h-px w-10 bg-primary/40" />
                  <Heart className="h-4 w-4" />
                  <span className="h-px w-10 bg-primary/40" />
                </div>
                <p className="text-center font-serif text-3xl font-semibold leading-tight">
                  Maria
                  <span className="mx-2 font-serif italic text-primary">&</span>
                  João
                </p>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Sábado, 14 de Setembro
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Fazenda Vista Bela · 16h
                </p>
                <div className="mt-8 rounded-xl border border-border/60 bg-muted/40 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">RSVP até 30/08</p>
                  <p className="mt-2 font-serif text-base">Confirmar presença</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-border/40 bg-card/40">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2 sm:text-sm">
            {trustBadges.map(({ Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROPOSTA DE VALOR */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Para noivos</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-5xl">
            Tudo do seu casamento em um único lugar.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Da primeira confirmação ao check-in no dia do evento, com um painel pensado para reduzir trabalho manual.
          </p>
        </div>
      </section>

      {/* RECURSOS EDITORIAIS */}
      <section id="recursos" className="border-y border-border/40 bg-muted/30 py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Recursos</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              O essencial para organizar o casamento
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Funcionalidades reais da plataforma, sem promessas vagas.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ n, Icon, title, text }) => (
              <article
                key={n}
                className="group relative rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elegant sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-serif text-2xl italic text-primary/40">{n}</span>
                </div>
                <h3 className="mt-6 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIÊNCIA DO CONVITE */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-12">
          <div className="order-2 md:order-1">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">A experiência</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Um convite pensado para a tela do convidado.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Layout responsivo, tipografia refinada e navegação fluida no celular. Cada bloco de conteúdo tem um
              propósito claro.
            </p>
            <ul className="mt-6 space-y-3">
              {experience.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span className="leading-relaxed text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Painel administrativo completo para gerenciar tudo
              </span>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative mx-auto w-full max-w-sm md:max-w-md">
              <div className="absolute inset-0 rotate-2 rounded-3xl bg-accent/40" aria-hidden />
              <div className="relative space-y-4 rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hoje</p>
                  <p className="mt-1 font-serif text-lg">128 confirmações</p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                    <div className="h-full w-3/4 rounded-full bg-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Presentes</p>
                    <p className="mt-1 font-serif text-lg">32</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensagens</p>
                    <p className="mt-1 font-serif text-lg">47</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cronograma</p>
                  <p className="mt-1 text-sm">16h · Cerimônia</p>
                  <p className="text-sm">18h · Recepção</p>
                  <p className="text-sm">22h · Festa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Como funciona</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Três passos, do setup ao dia do evento
            </h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 sm:gap-6 md:grid-cols-3">
            {steps.map(({ n, title, text }) => (
              <div key={n} className="rounded-2xl border border-border/60 bg-card p-7 transition-colors hover:border-primary/40 sm:p-8">
                <span className="font-serif text-4xl italic text-primary">{n}</span>
                <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-elegant p-8 text-center sm:p-10 md:p-16">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <p className="relative text-xs uppercase tracking-[0.3em] text-primary">Vamos começar</p>
          <h2 className="relative mt-3 font-serif text-3xl font-semibold leading-tight md:text-5xl">
            Pronto para criar o convite do seu casamento?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
            Fale com a gente no WhatsApp e receba o acesso para começar a personalizar a sua página.
          </p>
          <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="group w-full sm:w-auto">
                Falar no WhatsApp
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
            <a href="#temas">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Ver opções</Button>
            </a>
          </div>
        </div>
      </section>

      <ThemesShowcaseSection />

      <ShowcaseSection
        eventType="wedding"
        title="Casamentos em destaque"
        subtitle="Convites de casamento publicados pelos próprios noivos."
      />

      <MarketingFooter />
    </div>
  );
};

export default WeddingLanding;
