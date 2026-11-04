"use client";

import { Check, HeartHandshake } from "lucide-react";
import { useApp } from "@/lib/data/provider";
import { formatRelative } from "@/lib/date";

/**
 * Mensagem que o dependente recebe quando o responsável toca em
 * "Quero ajudar". Fica visível em qualquer tela da área do dependente até
 * ser dispensada, e chega em tempo real pela assinatura de notificações.
 */
export function HelpAcknowledgedBanner() {
  const { notifications, markNotificationRead, dependents } = useApp();
  const latest = notifications.find(
    (notification) => notification.type === "help_acknowledged" && !notification.readAt,
  );

  if (!latest) return null;

  const dependent = dependents.find((item) => item.id === latest.dependentId);

  return (
    <section
      role="status"
      aria-live="polite"
      className="mb-5 overflow-hidden rounded-3xl border border-primary/25 bg-primary-soft shadow-card animate-fade-up"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <HeartHandshake className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-primary-strong">
            {latest.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-primary-strong/90">
            {latest.body}
            {dependent ? ` — ${dependent.name}, você não está sozinho.` : ""}
          </p>
          <p className="mt-1 text-[0.68rem] font-bold text-primary-strong/70">
            {formatRelative(latest.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markNotificationRead(latest.id)}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-surface px-3 text-xs font-extrabold text-primary-strong transition hover:bg-white"
        >
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
          Entendi
        </button>
      </div>
    </section>
  );
}
