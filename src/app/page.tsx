import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  HeartHandshake,
  HeartPulse,
  LifeBuoy,
  Music2,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
} from "lucide-react";
import { Brand, LogoMark } from "@/components/brand";

const DEPENDENT_FEATURES = [
  {
    icon: CalendarCheck2,
    emoji: "🗓️",
    title: "Uma rotina que faz sentido",
    description:
      "Atividades com horário, imagem e dias da semana. Marcar como concluído é simples e dá aquela sensação de dever cumprido.",
  },
  {
    icon: Music2,
    emoji: "🎧",
    title: "Sons para se autorregular",
    description:
      "Chuva, mar, floresta e ruídos suaves para acalmar o corpo em momentos de sobrecarga sensorial.",
  },
  {
    icon: Smile,
    emoji: "💬",
    title: "Emoções sem julgamento",
    description:
      "Escolha como você está se sentindo, conte o que aconteceu e guarde esse registro para se conhecer melhor.",
  },
  {
    icon: LifeBuoy,
    emoji: "🆘",
    title: "Pedir ajuda é um gesto só",
    description:
      "Um botão grande e sempre visível avisa o responsável na hora, sem precisar explicar nada no meio de uma crise.",
  },
];

const RESPONSIBLE_FEATURES = [
  {
    icon: HeartPulse,
    title: "Variações emocionais",
    description: "Veja os registros da semana, os motivos e os padrões que merecem atenção.",
  },
  {
    icon: CalendarCheck2,
    title: "Progresso da rotina",
    description: "Acompanhe o que foi concluído e o que ficou pendente, dia a dia, sem cobrança.",
  },
  {
    icon: LifeBuoy,
    title: "Pedidos de ajuda em tempo real",
    description: "Alerta visual e sonoro identificando quem pediu ajuda e a que horas.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "O responsável cria os perfis",
    description: "Cada dependente tem seu próprio espaço, com cor e avatar escolhidos por ele.",
  },
  {
    number: "2",
    title: "O dependente organiza o dia",
    description: "Monta a rotina, registra emoções e usa os sons quando precisa de um tempo.",
  },
  {
    number: "3",
    title: "A família acompanha de perto",
    description: "O responsável vê o progresso e recebe os pedidos de ajuda sem invadir a autonomia.",
  },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Brand />
        <nav aria-label="Navegação da página" className="hidden items-center gap-7 md:flex">
          <a href="#recursos" className="text-sm font-bold text-ink-soft hover:text-primary">
            Recursos
          </a>
          <a href="#responsavel" className="text-sm font-bold text-ink-soft hover:text-primary">
            Para o responsável
          </a>
          <a href="#acessibilidade" className="text-sm font-bold text-ink-soft hover:text-primary">
            Acessibilidade
          </a>
        </nav>
        <Link href="/entrar" className="btn-primary">
          Entrar
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-14">
          <div className="animate-fade-up">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1.5">
              <Sparkles className="size-3.5" aria-hidden />
              Autonomia com acolhimento
            </p>
            <h1 className="mt-5 font-display text-[2.6rem] font-black leading-[1.06] tracking-tight text-ink sm:text-6xl">
              Um dia mais previsível.
              <span className="block text-primary">Com espaço para sentir.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              O ConectaTEA ajuda pessoas com Transtorno do Espectro Autista a organizar a rotina,
              regular as emoções e pedir ajuda — enquanto aproxima quem cuida, sem tirar a
              autonomia de ninguém.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/entrar" className="btn-primary min-h-12 px-6 text-base">
                Começar agora
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href="#recursos" className="btn-secondary min-h-12 px-6 text-base">
                Conhecer os recursos
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-ink-soft">
              {["Interface acessível", "Sons relaxantes", "Alertas em tempo real"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="absolute -right-8 -top-8 size-40 rounded-full bg-lilac/40 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-10 -left-6 size-44 rounded-full bg-primary/20 blur-2xl"
            />
            <div className="card relative animate-fade-up p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-muted">
                    Meu dia
                  </p>
                  <p className="mt-1 font-display text-xl font-black text-ink">Hoje, terça-feira</p>
                </div>
                <div
                  className="flex size-12 items-center justify-center rounded-full bg-lilac text-2xl"
                  aria-hidden
                >
                  🦋
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-primary-soft/60 p-3.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-primary-strong">
                  <span>3 de 6 atividades</span>
                  <span>50%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full w-1/2 rounded-full bg-primary" />
                </div>
              </div>

              <ul className="mt-4 space-y-2.5">
                {[
                  { emoji: "🪥", title: "Escovar os dentes", time: "07:00", done: true },
                  { emoji: "🥐", title: "Café da manhã", time: "07:30", done: true },
                  { emoji: "🎒", title: "Ir para a escola", time: "08:00", done: false },
                  { emoji: "📚", title: "Leitura tranquila", time: "15:00", done: false },
                ].map((item) => (
                  <li
                    key={item.title}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                      item.done
                        ? "border-primary/20 bg-primary-soft/40"
                        : "border-line bg-surface"
                    }`}
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-sm ${
                        item.done ? "bg-primary text-white" : "bg-surface-2 text-muted"
                      }`}
                      aria-hidden
                    >
                      {item.done ? <Check className="size-4" strokeWidth={3} /> : item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-bold ${
                          item.done ? "text-muted line-through" : "text-ink"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[0.68rem] font-bold text-muted">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" aria-hidden>
                    😌
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-ink">Como você está?</p>
                    <p className="text-[0.68rem] text-ink-soft">Registrar emoção do dia</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[0.65rem] font-extrabold text-accent">
                  + toque
                </span>
              </div>
            </div>

            <div className="absolute -left-3 top-1/3 hidden animate-float rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-card sm:block">
              <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-muted">Som agora</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-ink">
                <span aria-hidden>🌧️</span> Chuva suave
              </p>
            </div>

            <div className="absolute -right-2 bottom-16 hidden sm:block">
              <div className="help-halo flex items-center gap-2 rounded-full bg-help px-4 py-2.5 text-sm font-extrabold text-white shadow-lift">
                <LifeBuoy className="size-4" aria-hidden />
                Preciso de ajuda
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-line/70 bg-surface/55 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="eyebrow">Para o dependente</p>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
                Ferramentas simples para um dia mais leve
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                Cada recurso foi pensado para reduzir esforço de leitura, evitar excesso de
                estímulos e dar previsibilidade.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {DEPENDENT_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="card group p-6 transition hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white"
                        aria-hidden
                      >
                        <Icon className="size-6" />
                      </span>
                      <span className="text-2xl" aria-hidden>
                        {feature.emoji}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-xl font-extrabold text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="responsavel" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow">Para o responsável</p>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
                Cuidar de perto, respeitando o espaço
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                O responsável acompanha emoções, rotina e pedidos de ajuda em um painel claro.
                Vários dependentes, cada um com sua própria história.
              </p>
              <Link href="/entrar" className="btn-primary mt-6">
                Acessar o painel
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <div className="space-y-3">
              {RESPONSIBLE_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-ink">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{feature.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-line/70 bg-surface/55 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="eyebrow">Como funciona</p>
              <h2 className="mx-auto mt-2 max-w-2xl font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
                Três passos para começar com calma
              </h2>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.number} className="card relative overflow-hidden p-6">
                  <span className="font-display text-5xl font-black text-primary/15" aria-hidden>
                    {step.number}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-extrabold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="acessibilidade" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="card grid gap-8 overflow-hidden p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="eyebrow">Acessibilidade de verdade</p>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-ink">
                Feito para ser usado com tranquilidade
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                Botões grandes, contraste cuidado, navegação por teclado, textos objetivos e
                respeito à redução de movimento. O visual é calmo de propósito.
              </p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {[
                  "Alvos de toque generosos",
                  "Ícones sempre acompanhados de texto",
                  "Leitores de tela suportados",
                  "Animação reduzida respeitada",
                  "Sons gerados no navegador",
                  "Sem excesso de estímulos",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-bold text-ink-soft">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-canvas p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft">
                  <Users className="size-6 text-primary" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Uma família conectada</p>
                  <p className="text-xs font-bold text-muted">Cada pessoa no seu ritmo</p>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                {[
                  { emoji: "🦋", label: "Lia registrou que está calma", tone: "bg-lilac/50" },
                  { emoji: "🦖", label: "Miguel concluiu 4 atividades", tone: "bg-primary-soft/70" },
                  { emoji: "🆘", label: "Pedido de ajuda reconhecido", tone: "bg-help-soft/70" },
                ].map((row) => (
                  <div key={row.label} className={`flex items-center gap-3 rounded-2xl ${row.tone} px-3.5 py-2.5`}>
                    <span className="text-xl" aria-hidden>
                      {row.emoji}
                    </span>
                    <p className="text-xs font-bold text-ink">{row.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[32px] bg-primary px-6 py-12 text-white sm:px-12">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-lilac/20"
            />
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider">
                  <HeartHandshake className="size-3.5" aria-hidden />
                  Comece no seu tempo
                </p>
                <h2 className="mt-4 font-display text-3xl font-black tracking-tight sm:text-4xl">
                  Um espaço seguro para a rotina de quem você ama
                </h2>
                <p className="mt-3 text-base leading-relaxed text-white/80">
                  Crie os perfis, monte a rotina e deixe o cuidado acontecer com mais previsibilidade
                  e menos ruído.
                </p>
              </div>
              <Link
                href="/entrar"
                className="btn min-h-12 shrink-0 bg-white px-6 text-base text-primary-strong hover:bg-white/90"
              >
                Entrar no ConectaTEA
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 bg-surface/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-3">
            <LogoMark className="size-9" />
            <div>
              <p className="font-display text-sm font-extrabold text-ink">ConectaTEA</p>
              <p className="text-xs text-muted">Autonomia, rotina e conexão.</p>
            </div>
          </div>
          <p className="text-xs text-muted">
            Feito com cuidado para pessoas com TEA e quem caminha ao lado.
          </p>
        </div>
      </footer>
    </div>
  );
}
