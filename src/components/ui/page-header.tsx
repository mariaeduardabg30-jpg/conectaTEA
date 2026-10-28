import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-black tracking-tight text-ink sm:text-[2.15rem]">
          {title}
        </h1>
        {description && <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  emoji = "🌱",
  title,
  description,
  action,
  tone = "neutral",
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "primary" | "help";
}) {
  const background =
    tone === "primary" ? "bg-primary-soft/60" : tone === "help" ? "bg-help-soft/70" : "bg-surface-2";
  return (
    <div className={`flex flex-col items-center rounded-3xl border border-dashed border-line-strong ${background} px-6 py-10 text-center`}>
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-24 animate-pulse rounded-3xl bg-canvas-deep/70" />
      <div className="h-24 animate-pulse rounded-3xl bg-canvas-deep/50" />
    </div>
  );
}

export function InlineSpinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`}
      aria-hidden
    />
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-help-soft px-4 py-3 text-sm font-bold text-help-strong">
      {children}
    </p>
  );
}
