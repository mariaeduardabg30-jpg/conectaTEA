"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Eye,
  EyeOff,
  HeartPulse,
  LifeBuoy,
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
import type { AppUser } from "@/lib/types";

type Tab = "responsavel" | "dependente";
type View = "login" | "signup";

function destinationFor(user: AppUser): string {
  return user.role === "dependente" ? "/dependente" : "/responsavel";
}

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
    setActiveDependentId,
  } = useApp();

  const [tab, setTab] = useState<Tab>("responsavel");
  const [view, setView] = useState<View>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isDemo = mode === "demo";
  const minPassword = isDemo ? 4 : 6;
  const isDependent = tab === "dependente";

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setNotice(null);
    setAge("");
  };

  const switchView = (next: View) => {
    setView(next);
    setError(null);
    setNotice(null);
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < minPassword) {
      setError(`A senha precisa ter pelo menos ${minPassword} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      const current = await signIn(email.trim(), password, tab);
      router.replace(destinationFor(current));
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

    let parsedAge: number | null = null;
    if (isDependent) {
      const value = Number(age);
      if (!age.trim() || !Number.isInteger(value) || value < 0 || value > 130) {
        setError("Informe uma idade válida.");
        return;
      }
      parsedAge = value;
    }

    if (password.length < minPassword) {
      setError(`A senha precisa ter pelo menos ${minPassword} caracteres.`);
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        role: tab,
        name: name.trim(),
        email: email.trim(),
        password,
        age: parsedAge,
      });
      if (result.user && !result.needsConfirmation) {
        router.replace(destinationFor(result.user));
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

              {user.role === "dependente" ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Seu espaço está pronto. Sua rotina, suas emoções e seus sons ficam guardados
                    só para você.
                  </p>
                  <div className="mt-6 grid gap-3">
                    <Link href="/dependente" className="btn-primary min-h-12 justify-between px-5">
                      <span className="flex items-center gap-2">
                        <Sparkles className="size-5" aria-hidden />
                        Abrir meu espaço
                      </span>
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Escolha por onde quer continuar. O mesmo acesso permite acompanhar como
                    responsável e abrir a área de cada dependente neste dispositivo.
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
                </>
              )}
            </div>
          ) : (
            <>
              <div
                className="flex rounded-full bg-surface-2 p-1"
                role="tablist"
                aria-label="Tipo de acesso"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "responsavel"}
                  onClick={() => switchTab("responsavel")}
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
                  onClick={() => switchTab("dependente")}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold transition ${
                    tab === "dependente" ? "bg-surface text-ink shadow-card" : "text-muted"
                  }`}
                >
                  <Sparkles className="size-4" aria-hidden />
                  Sou dependente
                </button>
              </div>

              <div className="mt-6">
                <h1 className="font-display text-[1.75rem] font-black leading-tight text-ink">
                  {view === "login"
                    ? isDependent
                      ? "Que bom ter você aqui"
                      : "Que bom ter você de volta"
                    : isDependent
                      ? "Crie seu cantinho"
                      : "Crie seu espaço de cuidado"}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {view === "login"
                    ? isDependent
                      ? "Entre para abrir sua rotina, seus sons e suas emoções."
                      : "Entre para acompanhar a rotina, as emoções e os pedidos de ajuda."
                    : isDependent
                      ? "Só precisamos do seu nome, e-mail e idade para começar."
                      : "Uma conta para acompanhar todos os seus dependentes."}
                </p>

                {isDemo && (
                  <p className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
                    <span className="font-extrabold text-accent">Modo demonstração.</span> As contas e
                    os dados ficam guardados apenas neste navegador. Para um ambiente real com login
                    seguro para a família, configure o Supabase (veja o README).
                  </p>
                )}

                <form
                  className="mt-5 space-y-4"
                  onSubmit={view === "login" ? submitLogin : submitSignUp}
                >
                  {view === "signup" && (
                    <div>
                      <label htmlFor="name" className="label">
                        {isDependent ? "Seu nome" : "Seu nome"}
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                          aria-hidden
                        />
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
                      <Mail
                        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                        aria-hidden
                      />
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

                  {view === "signup" && isDependent && (
                    <div>
                      <label htmlFor="age" className="label">
                        Idade
                      </label>
                      <div className="relative">
                        <CalendarDays
                          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                          aria-hidden
                        />
                        <input
                          id="age"
                          name="age"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={130}
                          className="input pl-12"
                          placeholder="Quantos anos você tem?"
                          value={age}
                          onChange={(event) => setAge(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="label">
                      Senha
                    </label>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                        aria-hidden
                      />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={view === "login" ? "current-password" : "new-password"}
                        className="input px-12"
                        placeholder={`Mínimo de ${minPassword} caracteres`}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={minPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>

                  {view === "login" && !isDemo && (
                    <div className="flex justify-end">
                      <Link
                        href="/recuperar-senha"
                        className="text-xs font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                  )}

                  {error && <ErrorNote>{error}</ErrorNote>}
                  {notice && (
                    <p
                      role="status"
                      className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary-strong"
                    >
                      {notice}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary min-h-12 w-full text-base"
                  >
                    {loading && <InlineSpinner className="size-4" />}
                    {view === "login" ? "Entrar" : "Criar minha conta"}
                    {!loading && <ArrowRight className="size-4" aria-hidden />}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-muted">
                  {view === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchView(view === "login" ? "signup" : "login")}
                    className="font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
                  >
                    {view === "login" ? "Criar conta" : "Entrar"}
                  </button>
                </p>
              </div>
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
