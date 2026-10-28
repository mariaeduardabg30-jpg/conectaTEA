"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CalendarCheck2,
  HeartPulse,
  Home,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  Music2,
  Smile,
  Users,
} from "lucide-react";
import { AlertListener, AlertSoundToggle } from "@/components/alert-listener";
import { Brand, LogoMark } from "@/components/brand";
import { DependentSwitcher } from "@/components/dependent-switcher";
import { HelpButton } from "@/components/help-button";
import { NotificationBell } from "@/components/notification-bell";
import { EmptyState, LoadingBlock } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { useHelpRequests } from "@/lib/hooks/use-help-requests";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof Home;
  exact?: boolean;
  badge?: boolean;
};

const RESPONSIBLE_NAV: NavItem[] = [
  { href: "/responsavel", label: "Visão geral", shortLabel: "Visão", icon: LayoutDashboard, exact: true },
  { href: "/responsavel/emocoes", label: "Emoções", shortLabel: "Emoções", icon: HeartPulse },
  { href: "/responsavel/rotina", label: "Rotina", shortLabel: "Rotina", icon: CalendarCheck2 },
  { href: "/responsavel/ajuda", label: "Pedidos de ajuda", shortLabel: "Ajuda", icon: LifeBuoy, badge: true },
  { href: "/responsavel/dependentes", label: "Dependentes", shortLabel: "Perfis", icon: Users },
];

const DEPENDENT_NAV: NavItem[] = [
  { href: "/dependente", label: "Meu dia", shortLabel: "Meu dia", icon: Home, exact: true },
  { href: "/dependente/rotina", label: "Minha rotina", shortLabel: "Rotina", icon: ListChecks },
  { href: "/dependente/sons", label: "Sons para acalmar", shortLabel: "Sons", icon: Music2 },
  { href: "/dependente/emocoes", label: "Minhas emoções", shortLabel: "Emoções", icon: Smile },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, user, mode, activeDependent, dependentsLoaded, signOut } = useApp();
  const role: "responsavel" | "dependente" = pathname.startsWith("/responsavel")
    ? "responsavel"
    : "dependente";
  const nav = role === "responsavel" ? RESPONSIBLE_NAV : DEPENDENT_NAV;
  const { data: helpRequests } = useHelpRequests();
  const pending = helpRequests.filter((request) => !request.acknowledgedAt).length;

  useEffect(() => {
    if (ready && !user) router.replace("/entrar");
  }, [ready, user, router]);

  if (!ready || !user) return <LoadingScreen />;

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const current = nav.find(isActive);
  const areaLabel = role === "responsavel" ? "Área do responsável" : "Área do dependente";
  const switchArea =
    role === "responsavel"
      ? { href: "/dependente", label: "Abrir área do dependente" }
      : { href: "/responsavel", label: "Ir para a área do responsável" };

  const logout = async () => {
    await signOut();
    router.replace("/entrar");
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-[100] rounded-full bg-primary px-4 py-2 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-line/80 bg-surface/85 backdrop-blur lg:flex">
        <div className="px-6 pb-5 pt-6">
          <Brand href={role === "responsavel" ? "/responsavel" : "/dependente"} />
        </div>

        <div className="mx-4 mb-3 rounded-2xl bg-canvas/80 px-3.5 py-2.5">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-muted">
            {areaLabel}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-ink">
            {role === "responsavel" ? (user.name ?? "Responsável") : (activeDependent?.name ?? "Dependente")}
          </p>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.badge && pending > 0 && (
                  <span className="flex min-w-5 items-center justify-center rounded-full bg-help px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white">
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 px-4 pb-4">
          {mode === "demo" && (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface-2 px-3.5 py-2.5">
              <p className="text-xs font-extrabold text-accent">Modo demonstração</p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">
                Dados de exemplo salvos neste navegador.
              </p>
            </div>
          )}
          <Link
            href={switchArea.href}
            className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-bold text-ink-soft transition hover:bg-surface-2"
          >
            <ArrowRightLeft className="size-4" aria-hidden />
            {switchArea.label}
          </Link>
          <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-extrabold text-primary-strong">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-ink">{user.name}</p>
              <p className="truncate text-[0.65rem] text-muted">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="icon-button size-8 border-0"
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Link href={role === "responsavel" ? "/responsavel" : "/dependente"} aria-label="ConectaTEA">
                <LogoMark className="size-9" />
              </Link>
              <div className="hidden sm:block">
                <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-muted">
                  {areaLabel}
                </p>
                <p className="text-sm font-extrabold text-ink">
                  {current?.label ?? (role === "responsavel" ? "Visão geral" : "Meu dia")}
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-muted">
                {areaLabel}
              </p>
              <p className="font-display text-lg font-extrabold text-ink">
                {current?.label ?? (role === "responsavel" ? "Visão geral" : "Meu dia")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <DependentSwitcher manageHref={role === "responsavel" ? "/responsavel/dependentes" : undefined} />
              {role === "responsavel" ? (
                <>
                  <AlertSoundToggle />
                  <NotificationBell pending={pending} />
                </>
              ) : (
                <Link
                  href="/responsavel"
                  className="icon-button"
                  aria-label="Ir para a área do responsável"
                  title="Área do responsável"
                >
                  <ArrowRightLeft className="size-5" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="icon-button lg:hidden"
                aria-label="Sair da conta"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <main
          id="conteudo"
          className="mx-auto w-full max-w-[1240px] px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16"
        >
          {role === "dependente" && !activeDependent ? (
            dependentsLoaded ? (
              <div className="card mx-auto max-w-2xl p-6 sm:p-10">
                <EmptyState
                  emoji="🌱"
                  title="Seu perfil ainda não foi criado"
                  description="Peça para o responsável criar seu perfil na área dele. Assim sua rotina, emoções e sons ficam guardados só para você."
                  tone="primary"
                  action={
                    <Link href="/responsavel/dependentes" className="btn-primary">
                      Ir para a área do responsável
                    </Link>
                  }
                />
              </div>
            ) : (
              <LoadingBlock label="Carregando perfis…" />
            )
          ) : (
            children
          )}
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[0.62rem] font-bold transition ${
                  active ? "text-primary-strong" : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full transition ${
                    active ? "bg-primary text-white" : ""
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                  {item.badge && pending > 0 && (
                    <span className="absolute right-2 top-0 flex min-w-4 items-center justify-center rounded-full bg-help px-1 text-[0.55rem] font-extrabold text-white">
                      {pending}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {role === "responsavel" && <AlertListener />}
      {role === "dependente" && activeDependent && <HelpButton />}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <LogoMark className="size-14 animate-float" />
      <div className="text-center">
        <p className="font-display text-lg font-extrabold text-ink">ConectaTEA</p>
        <p className="mt-1 text-sm text-muted">Preparando seu espaço…</p>
      </div>
      <div className="flex items-end gap-1" aria-hidden>
        {[0, 1, 2, 3].map((bar) => (
          <span
            key={bar}
            className="sound-bar h-6 w-1.5 rounded-full bg-primary/60"
            style={{ animationDelay: `${bar * 0.12}s` }}
          />
        ))}
      </div>
      <span className="sr-only">Carregando</span>
    </div>
  );
}
