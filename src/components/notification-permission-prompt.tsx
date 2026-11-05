"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Check, X } from "lucide-react";
import {
  enablePushNotifications,
  getNotificationPermission,
  NOTIFICATION_PERMISSION_EVENT,
  requestNotificationPermission,
} from "@/lib/push";
import { useNotificationPermission } from "@/lib/hooks/use-notification-permission";

const DISMISS_KEY = "conectatea.notification-prompt.dismissed.v1";

/**
 * Aviso global para pedir a permissão de notificações do aparelho em uso.
 * A permissão é solicitada por ação explícita do usuário; o sino de
 * notificações continua mostrando o estado e permitindo ativar depois.
 */
export function NotificationPermissionPrompt() {
  const permission = useNotificationPermission();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const onPermissionChange = () => {
      if (getNotificationPermission() === "granted") {
        setCelebrate(true);
        setDismissed(false);
      }
    };
    window.addEventListener(NOTIFICATION_PERMISSION_EVENT, onPermissionChange);
    return () => {
      window.removeEventListener(NOTIFICATION_PERMISSION_EVENT, onPermissionChange);
    };
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    const timer = window.setTimeout(() => setCelebrate(false), 8000);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  const dismiss = () => {
    setDismissed(true);
    setCelebrate(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sem persistência: o aviso volta na próxima navegação.
    }
  };

  const activate = async () => {
    setBusy(true);
    try {
      // A permissão do aparelho vem primeiro (gesto do usuário). Depois
      // tentamos a inscrição push, quando o restante estiver configurado.
      await requestNotificationPermission();
      await enablePushNotifications();
    } finally {
      setBusy(false);
    }
  };

  if (permission === "loading" || permission === "unsupported") return null;
  if (dismissed && !celebrate) return null;
  if (permission === "granted" && !celebrate) return null;

  const denied = permission === "denied";
  const granted = permission === "granted";

  return (
    <section
      role="status"
      aria-live="polite"
      className={`mb-5 overflow-hidden rounded-3xl border shadow-card animate-fade-up ${
        denied ? "border-accent/25 bg-accent-soft/70" : "border-primary/25 bg-primary-soft"
      }`}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-white ${
            denied ? "bg-accent" : "bg-primary"
          }`}
        >
          {granted ? (
            <Check className="size-5" strokeWidth={3} aria-hidden />
          ) : denied ? (
            <BellOff className="size-5" aria-hidden />
          ) : (
            <BellRing className="size-5" aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[0.65rem] font-extrabold uppercase tracking-[0.14em] ${
              denied ? "text-accent" : "text-primary-strong/70"
            }`}
          >
            {granted ? "Notificações ativadas" : denied ? "Notificações bloqueadas" : "Notificações no aparelho"}
          </p>
          <p
            className={`mt-1 font-display text-base font-extrabold leading-snug ${
              denied ? "text-ink" : "text-primary-strong"
            }`}
          >
            {granted
              ? "Pronto! Este aparelho pode receber avisos."
              : denied
                ? "Libere as notificações neste aparelho."
                : "Ative os avisos neste dispositivo."}
          </p>
          <p
            className={`mt-1 text-sm leading-relaxed ${
              denied ? "text-ink-soft" : "text-primary-strong/90"
            }`}
          >
            {granted
              ? "Os lembretes das tarefas e os pedidos de ajuda vão aparecer neste aparelho."
              : denied
                ? "O navegador está bloqueando os avisos. Abra as permissões do site (ícone de cadeado ao lado do endereço), permita notificações e recarregue a página."
                : "Receba os lembretes das tarefas e os pedidos de ajuda mesmo quando estiver em outra tela."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {granted || denied ? (
              <button
                type="button"
                onClick={dismiss}
                className={`min-h-9 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  denied
                    ? "bg-accent text-white hover:opacity-90"
                    : "bg-primary text-white hover:bg-primary-strong"
                }`}
              >
                Entendi
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void activate()}
                  disabled={busy}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-primary-strong disabled:opacity-60"
                >
                  <BellRing className="size-3.5" aria-hidden />
                  {busy ? "Ativando…" : "Ativar notificações"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="min-h-9 rounded-full border border-primary/25 bg-surface px-3.5 py-1.5 text-xs font-extrabold text-primary-strong transition hover:bg-white"
                >
                  Agora não
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="icon-button size-8 border-0"
          aria-label="Dispensar aviso de notificações"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
