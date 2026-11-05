"use client";

import Link from "next/link";
import { AlarmClockCheck, ArrowRight, X } from "lucide-react";
import { useApp } from "@/lib/data/provider";
import { toDateKey } from "@/lib/date";
import { useClientNow } from "@/lib/hooks/use-client-now";

/**
 * Aviso de "hora da tarefa" visível em qualquer página do app. O lembrete é
 * criado pelo banco perto do horário programado e chega pela assinatura de
 * notificações, então o dependente vê o nome da atividade mesmo estando em
 * outra tela.
 */
export function TaskReminderBanner({ area }: { area?: "responsavel" | "dependente" }) {
  const { user, notifications, markNotificationRead } = useApp();
  const now = useClientNow(30_000);
  const todayKey = now ? toDateKey(now) : "";

  if (!user) return null;

  const latest = notifications.find(
    (notification) =>
      notification.type === "task_reminder" &&
      !notification.readAt &&
      (!notification.scheduledDate || notification.scheduledDate === todayKey),
  );

  if (!latest) return null;

  const target = area ?? (user.role === "dependente" ? "dependente" : "responsavel");
  const href = target === "dependente" ? "/dependente" : "/responsavel/rotina";

  return (
    <section
      role="status"
      aria-live="polite"
      className="mb-5 overflow-hidden rounded-3xl border border-accent/30 bg-accent-soft/70 shadow-card animate-fade-up"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <AlarmClockCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-accent">
            Hora da tarefa
          </p>
          <p className="mt-1 font-display text-base font-extrabold leading-snug text-ink">
            {latest.body || latest.title}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={href}
              onClick={() => void markNotificationRead(latest.id)}
              className="btn-primary min-h-9 px-3.5 py-1.5 text-xs"
            >
              Ver rotina
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => void markNotificationRead(latest.id)}
              className="btn-secondary min-h-9 px-3.5 py-1.5 text-xs"
            >
              Entendi
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void markNotificationRead(latest.id)}
          className="icon-button size-8 border-0"
          aria-label="Dispensar lembrete"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
