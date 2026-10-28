"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  Eye,
  EyeOff,
  HeartPulse,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  Mail,
  Music2,
  Sparkles,
  User,
} from "lucide-react";
import { Brand, LogoMark } from "@/components/brand";
import { ErrorNote, InlineSpinner } from "@/components/ui/page-header";
import { friendlyAuthError, useApp } from "@/lib/data/provider";
import { readableTextColor } from "@/lib/theme";

type Tab = "responsavel" | "dependente";
type View = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const {
    mode,
    user,
    dependents,
    dependentsLoading,
    dependentsLoaded,
    signIn,
    signUp,
    enterDemo,
    setActiveDependentId,
  } = useApp();

  const [tab, setTab] = useState<Tab>("responsavel");
  const [view, setView] = useState<View>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isDemo = mode === "demo";

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < (isDemo ? 4 : 6)) {
      setError(`A senha precisa ter pelo menos ${isDemo ? 4 : 6} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/responsavel");
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  const submitSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (name.trim().length < 2) {
      setError("Informe seu nome.");
      return;
    }
    if (!email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < (isDemo ? 4 : 6)) {
      setError(`A senha precisa ter pelo menos ${isDemo ? 4 : 6} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(name.trim(), email.trim(), password);
      if (result.user && !result.needsConfirmation) {
        router.replace("/responsavel");
        return;
      }
      setNotice("Cadastro criado! Confira seu e-mail para confirmar a conta antes de entrar.");
      setView("login");
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  const enterDemoAsResponsible = async () => {
    setError(null);
    setStartingDemo(true);
    try {
      await enterDemo();
      router.replace("/responsavel");
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setStartingDemo(false);
    }
  };

  const enterDemoForDependents = async () => {
    setError(null);
    setStartingDemo(true);
    try {
      await enterDemo();
      setTab("dependente");
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setStartingDemo(false);
    }
  };

  const chooseDependent = (id: string) => {
    setActiveDependentId(id);
    router.push("/dependente");
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <Link href="/" className="btn-ghost min-h-10 px-3 text-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Voltar ao site
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-12 lg:pt-10">
        <section className="card order-2 p-5 sm:p-8 lg:order-1">
          {user ? (
            <div>
              <p className="eyebrow">Você já está conectado</p>
              <h1 className="mt-2 font-display text-3xl font-black text-ink">
                Olá, {user.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Escolha por onde quer continuar. O mesmo acesso permite acompanhar como responsável
                e abrir a área de cada dependente neste dispositivo.
              </p>
              <div className="mt-6 grid gap-3">
                <Link href="/responsavel" className="btn-primary min-h-12 justify-between px-5">
                  <span className="flex items-center gap-2">
                    <HeartPulse className="size-5" aria-hidden />
                    Área do responsável
                  </span>
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>

              <div className="mt-5 rounded-3xl border border-line bg-surface-2/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="eyebrow">Área do dependente</p>
                    <h2 className="mt-1 font-display text-lg font-extrabold text-ink">
                      Quem vai usar agora?
                    </h2>
                  </div>
                  <Link
                    href="/responsavel/dependentes"
                    className="text-xs font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
                  >
                    Gerenciar perfis
                  </Link>
                </div>

                {dependentsLoading || !dependentsLoaded ? (
                  <p className="mt-4 flex items-center gap-2 text-sm font-bold text-muted">
                    <InlineSpinner className="size-4" />
                    Carregando perfis…
                  </p>
                ) : dependents.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    Nenhum perfil criado ainda. Crie o primeiro na área do responsável.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {dependents.map((dependent) => (
                      <li key={dependent.id}>
                        <button
                          type="button"
                          onClick={() => chooseDependent(dependent.id)}
                          className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                        >
                          <span
                            className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl"
                            style={{
                              backgroundColor: dependent.color,
                              color: readableTextColor(dependent.color),
                            }}
                            aria-hidden
                          >
                            {dependent.avatar}
                          </span>
                          <span className="flex-1">
                            <span className="block font-display text-base font-extrabold text-ink">
                              {dependent.name}
                            </span>
                            <span className="text-[0.68rem] font-bold text-muted">
                              Abrir meu espaço
                            </span>
                          </span>
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-muted transition group-hover:bg-primary group-hover:text-white">
                            <ArrowRight className="size-4" aria-hidden />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
                Dica para tablets compartilhados: abra a área do dependente e use o seletor de
                perfil no topo da tela para trocar de pessoa.
              </p>
            </div>
          ) : (
            <>
              <div className="flex rounded-full bg-surface-2 p-1" role="tablist" aria-label="Tipo de acesso">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "responsavel"}
                  onClick={() => {
                    setTab("responsavel");
                    setError(null);
                    setNotice(null);
                  }}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold transition ${
                    tab === "responsavel" ? "bg-surface text-ink shadow-card" : "text-muted"
                  }`}
                >
                  <HeartPulse className="size-4" aria-hidden />
                  Sou responsável
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "dependente"}
                  onClick={() => {
                    setTab("dependente");
                    setError(null);
                    setNotice(null);
                  }}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold transition ${
                    tab === "dependente" ? "bg-surface text-ink shadow-card" : "text-muted"
                  }`}
                >
                  <Sparkles className="size-4" aria-hidden />
                  Sou dependente
                </button>
              </div>

              {tab === "responsavel" ? (
                <div className="mt-6">
                  <h1 className="font-display text-[1.75rem] font-black leading-tight text-ink">
                    {view === "login" ? "Que bom ter você de volta" : "Crie seu espaço de cuidado"}
                  </h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {view === "login"
                      ? "Entre para acompanhar a rotina, as emoções e os pedidos de ajuda."
                      : "Uma conta para acompanhar todos os seus dependentes."}
                  </p>

                  {isDemo && (
                    <div className="mt-4 rounded-2xl border border-dashed border-accent/40 bg-accent-soft/60 px-4 py-3">
                      <p className="flex items-center gap-1.5 text-xs font-extrabold text-accent">
                        <Sparkles className="size-3.5" aria-hidden />
                        Modo demonstração
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                        Use qualquer e-mail e senha com 4+ caracteres, ou entre direto com os dados de
                        exemplo.
                      </p>
                      <button
                        type="button"
                        onClick={enterDemoAsResponsible}
                        disabled={startingDemo}
                        className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:brightness-105 disabled:opacity-60"
                      >
                        {startingDemo ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ArrowRight className="size-3.5" aria-hidden />}
                        Entrar com dados de exemplo
                      </button>
                    </div>
                  )}

                  <form className="mt-5 space-y-4" onSubmit={view === "login" ? submitLogin : submitSignUp}>
                    {view === "signup" && (
                      <div>
                        <label htmlFor="name" className="label">
                          Seu nome
                        </label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
                          <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            className="input pl-12"
                            placeholder="Como podemos chamar você?"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="email" className="label">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          className="input pl-12"
                          placeholder="voce@exemplo.com"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="label">
                        Senha
                      </label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={view === "login" ? "current-password" : "new-password"}
                          className="input px-12"
                          placeholder={isDemo ? "Mínimo de 4 caracteres" : "Mínimo de 6 caracteres"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          minLength={isDemo ? 4 : 6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                        </button>
                      </div>
                    </div>

                    {error && <ErrorNote>{error}</ErrorNote>}
                    {notice && (
                      <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary-strong">
                        {notice}
                      </p>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary min-h-12 w-full text-base">
                      {loading && <InlineSpinner className="size-4" />}
                      {view === "login" ? "Entrar" : "Criar minha conta"}
                      {!loading && <ArrowRight className="size-4" aria-hidden />}
                    </button>
                  </form>

                  <p className="mt-5 text-center text-sm text-muted">
                    {view === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setView(view === "login" ? "signup" : "login");
                        setError(null);
                        setNotice(null);
                      }}
                      className="font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
                    >
                      {view === "login" ? "Criar conta" : "Entrar"}
                    </button>
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <h1 className="font-display text-[1.75rem] font-black leading-tight text-ink">
                    Qual é o seu perfil?
                  </h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Escolha seu nome para abrir o seu espaço. Se ainda não aparece, peça ao
                    responsável para criar seu perfil.
                  </p>

                  <div className="mt-6 rounded-3xl bg-surface-2 p-5">
                    <p className="font-display text-lg font-extrabold text-ink">
                      O responsável entra primeiro
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      Neste dispositivo, o acesso do dependente usa a sessão da família. Peça para
                      o responsável entrar uma vez — depois é só escolher seu perfil na tela
                      “Quem vai usar agora?”.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab("responsavel")}
                      className="btn-primary mt-4"
                    >
                      Entrar como responsável
                    </button>
                    {isDemo && (
                      <button
                        type="button"
                        onClick={enterDemoForDependents}
                        disabled={startingDemo}
                        className="btn-secondary mt-2"
                      >
                        {startingDemo ? <InlineSpinner className="size-4" /> : <Sparkles className="size-4" aria-hidden />}
                        Ver perfis de demonstração
                      </button>
                    )}
                  </div>

                  {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

                </div>
              )}
            </>
          )}
        </section>

        <aside className="order-1 overflow-hidden rounded-[32px] bg-primary p-6 text-white shadow-lift sm:p-9 lg:order-2 lg:sticky lg:top-8">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
              <LogoMark className="size-5" />
            </span>
            ConectaTEA
          </div>
          <h2 className="mt-5 max-w-md font-display text-3xl font-black leading-tight sm:text-4xl">
            Um cantinho só seu, com a família por perto.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
            Previsibilidade para o dia a dia, acolhimento nos momentos difíceis e um jeito simples de
            mostrar que ninguém precisa atravessar tudo sozinho.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: CalendarCheck2, text: "Rotina visual com horários e conclusão em um toque" },
              { icon: Music2, text: "Sons relaxantes gerados no próprio navegador" },
              { icon: HeartPulse, text: "Registro de emoções e motivos ao longo da semana" },
              { icon: LifeBuoy, text: "Pedido de ajuda com alerta imediato ao responsável" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-bold leading-relaxed text-white/90">{item.text}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 rounded-2xl bg-white/10 p-4">
            <p className="text-sm font-bold leading-relaxed text-white/90">
              “A rotina não é uma prisão. Ela é um mapa que ajuda a chegar onde a gente quer.”
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white/60">
              ConectaTEA · autonomia com afeto
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
