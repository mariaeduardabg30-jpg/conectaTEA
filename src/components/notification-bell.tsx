"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClockCheck,
  Bell,
  CalendarCheck2,
  CheckCheck,
  HeartHandshake,
  LifeBuoy,
  BellRing,
  Check,
  X,
} from "lucide-react";
import { useApp } from "@/lib/data/provider";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushState,
  type PushState,
} from "@/lib/push";
import { formatRelative } from "@/lib/date";
import type { AppNotification, NotificationType } from "@/lib/types";

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; label: string; classes: string }
> = {
  help_request: {
    icon: LifeBuoy,
    label: "Pedido de ajuda",
    classes: "bg-help-soft text-help-strong",
  },
  help_acknowledged: {
    icon: HeartHandshake,
    label: "Ajuda a caminho",
    classes: "bg-primary-soft text-primary-strong",
  },
  task_created: {
    icon: CalendarCheck2,
    label: "Nova tarefa",
    classes: "bg-primary-soft text-primary-strong",
  },
  task_reminder: {
    icon: AlarmClockCheck,
    label: "Lembrete",
    classes: "bg-sun/40 text-accent",
  },
  task_completed: {
    icon: CheckCheck,
    label: "Concluída",
    classes: "bg-primary-soft text-primary-strong",
  },
};

function targetFor(type: NotificationType, isResponsible: boolean): string {
  if (!isResponsible) return "/dependente";
  return type === "help_request" || type === "help_acknowledged"
    ? "/responsavel/ajuda"
    : "/responsavel/rotina";
}

export function NotificationBell() {
  const router = useRouter();
  const {
    user,
    notifications,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    dependents,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<PushState | "loading">("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const dependentName = useCallback(
    (dependentId: string) =>
      dependents.find((dependent) => dependent.id === dependentId)?.name ?? null,
    [dependents],
  );

  useEffect(() => {
    let cancelled = false;
    getPushState()
      .then((state) => {
        if (!cancelled) setPushState(state);
      })
      .catch(() => {
        if (!cancelled) setPushState("unsupported");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items = useMemo(() => notifications.slice(0, 30), [notifications]);

  // Notificações push: qualquer conta pode receber (o dependente recebe os
  // lembretes das próprias tarefas; o responsável, o que acontece na rotina).
  const isResponsible = user?.role === "responsavel";

  const activatePush = async () => {
    setPushBusy(true);
    try {
      setPushState(await enablePushNotifications());
    } finally {
      setPushBusy(false);
    }
  };

  const deactivatePush = async () => {
    setPushBusy(true);
    try {
      setPushState(await disablePushNotifications());
    } finally {
      setPushBusy(false);
    }
  };

  const openItem = (notification: AppNotification) => {
    if (!notification.readAt) void markNotificationRead(notification.id);
    setOpen(false);
    router.push(targetFor(notification.type, isResponsible));
  };

  const unread = unreadNotifications;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-primary/30 hover:bg-primary-soft/60 hover:text-primary-strong"
        aria-label={
          unread > 0
            ? `Notificações (${unread} não lida${unread > 1 ? "s" : ""})`
            : "Notificações"
        }
        title="Notificações"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-help px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 z-50 mt-2 flex max-h-[78dvh] w-[min(94vw,24.5rem)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift animate-fade-up"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line/80 px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-base font-black text-ink">
              <BellRing className="size-4 text-primary" aria-hidden />
              Notificações
            </h2>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[0.68rem] font-bold text-primary transition hover:bg-primary-soft"
                >
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  Marcar todas como lidas
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="icon-button size-8 border-0"
                aria-label="Fechar notificações"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-2xl" aria-hidden>
                  🔔
                </p>
                <p className="mt-2 text-sm font-bold text-ink-soft">Nenhuma notificação ainda</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Avisos de tarefas, lembretes no horário e pedidos de ajuda aparecem aqui.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line/60">
                {items.map((item) => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  const unreadItem = !item.readAt;
                  const name = dependentName(item.dependentId);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2 ${
                          unreadItem ? "bg-primary-soft/30" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${meta.classes}`}
                          aria-hidden
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wide text-muted">
                              {meta.label}
                            </span>
                            <span className="shrink-0 text-[0.65rem] font-bold text-muted">
                              {formatRelative(item.createdAt)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-sm font-extrabold leading-snug text-ink">
                            {item.title}
                            {name ? <span className="font-bold text-muted"> · {name}</span> : null}
                          </span>
                          {item.body && (
                            <span className="mt-0.5 block truncate text-xs leading-snug text-ink-soft">
                              {item.body}
                            </span>
                          )}
                        </span>
                        {unreadItem && (
                          <span
                            className="mt-2 size-2.5 shrink-0 rounded-full bg-primary"
                            aria-label="Não lida"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-line/80 bg-surface-2/50 px-4 py-3">
            <PushRow
              state={pushState}
              busy={pushBusy}
              onActivate={() => void activatePush()}
              onDeactivate={() => void deactivatePush()}
            />
            {isResponsible && (
              <Link
                href="/responsavel/ajuda"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-extrabold text-primary transition hover:bg-primary-soft/60"
              >
                <LifeBuoy className="size-4" aria-hidden />
                Ver todos os pedidos de ajuda
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PushRow({
  state,
  busy,
  onActivate,
  onDeactivate,
}: {
  state: PushState | "loading";
  busy: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  if (state === "loading") {
    return <p className="text-[0.68rem] font-bold text-muted">Verificando notificações push…</p>;
  }
  if (state === "subscribed") {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.68rem] font-extrabold text-primary-strong">
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
          Notificações push ativadas neste dispositivo
        </p>
        <button
          type="button"
          onClick={onDeactivate}
          disabled={busy}
          className="text-[0.68rem] font-bold text-muted underline underline-offset-2 transition hover:text-ink"
        >
          {busy ? "Aguarde…" : "Desativar"}
        </button>
      </div>
    );
  }
  if (state === "inactive") {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.68rem] leading-snug text-ink-soft">
          Receba avisos mesmo com o app fechado.
        </p>
        <button
          type="button"
          onClick={onActivate}
          disabled={busy}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-[0.68rem] font-extrabold text-white transition hover:bg-primary-strong disabled:opacity-60"
        >
          {busy ? "Ativando…" : "Ativar notificações"}
        </button>
      </div>
    );
  }
  const hint: Record<Exclude<PushState, "subscribed" | "inactive">, string> = {
    demo: "Notificações push funcionam com o Supabase configurado (veja o README).",
    "missing-key": "A chave pública VAPID ainda não foi configurada no build.",
    unsupported: "Este navegador não suporta notificações push.",
  };
  return <p className="text-[0.68rem] leading-snug text-muted">{hint[state]}</p>;
}
