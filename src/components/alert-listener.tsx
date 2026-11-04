"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, HeartHandshake, LifeBuoy, Volume2, X } from "lucide-react";
import { InlineSpinner } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { playHelpAlert, unlockAudio } from "@/lib/audio/alerts";
import { setAlertSoundEnabled, useAlertSound } from "@/lib/audio/preferences";
import { formatRelative } from "@/lib/date";
import { readableTextColor } from "@/lib/theme";

export function AlertSoundToggle() {
  const enabled = useAlertSound();

  return (
    <button
      type="button"
      onClick={() => setAlertSoundEnabled(!enabled)}
      aria-pressed={enabled}
      className="icon-button"
      title={enabled ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
      aria-label={enabled ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
    >
      {enabled ? (
        <Volume2 className="size-5" aria-hidden />
      ) : (
        <VolumeXIcon />
      )}
    </button>
  );
}

function VolumeXIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

export function AlertListener() {
  const { latestHelp, dependents, dismissHelpAlert, backend, user } = useApp();
  const soundEnabled = useAlertSound();
  const soundEnabledRef = useRef(soundEnabled);
  const [helping, setHelping] = useState(false);
  const [helpError, setHelpError] = useState<{ id: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Os navegadores só liberam áudio depois de um gesto do usuário. Como a
  // preferência já vem ativada, desbloqueamos o áudio no primeiro toque/tecla
  // para que o alerta de ajuda toque de verdade quando o pedido chegar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlock = () => {
      if (soundEnabledRef.current) void unlockAudio();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    if (!latestHelp) return;
    if (soundEnabledRef.current) void playHelpAlert();
    const timer = window.setTimeout(() => dismissHelpAlert(), 30000);
    return () => window.clearTimeout(timer);
  }, [latestHelp, dismissHelpAlert]);

  const offerHelp = async () => {
    if (!latestHelp || helping) return;
    const requestId = latestHelp.id;
    setHelping(true);
    setHelpError(null);
    try {
      await backend.acknowledgeHelpRequest(requestId, user?.name ?? "Responsável");
      dismissHelpAlert();
    } catch (cause) {
      setHelpError({
        id: requestId,
        message:
          cause instanceof Error
            ? cause.message
            : "Não foi possível avisar. Tente novamente.",
      });
    } finally {
      setHelping(false);
    }
  };

  if (!latestHelp) return null;

  const showSoundHint = !soundEnabled;

  const dependent = dependents.find((item) => item.id === latestHelp.dependentId);

  return (
    <div className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-md sm:left-auto sm:right-5 sm:top-5 sm:mx-0">
      <div
        role="alert"
        aria-live="assertive"
        className="overflow-hidden rounded-3xl border border-help/30 bg-surface shadow-lift animate-fade-up"
      >
        <div className="flex items-center gap-2 bg-help px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white">
          <BellRing className="size-4" aria-hidden />
          Pedido de ajuda
        </div>
        <div className="flex items-start gap-3 p-4">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl"
            style={{
              backgroundColor: dependent?.color ?? "#F4AAA3",
              color: readableTextColor(dependent?.color ?? "#F4AAA3"),
            }}
            aria-hidden
          >
            {dependent?.avatar ?? "🆘"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold text-ink">
              {dependent?.name ?? "Um dependente"} precisa de ajuda
            </p>
            <p className="text-sm text-muted">{formatRelative(latestHelp.createdAt)}</p>
            {showSoundHint && (
              <button
                type="button"
                onClick={() => {
                  setAlertSoundEnabled(true);
                  void playHelpAlert();
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-help underline underline-offset-2"
              >
                <Volume2 className="size-3.5" aria-hidden />
                Ativar alerta sonoro
              </button>
            )}
            {helpError?.id === latestHelp.id && (
              <p className="mt-2 text-xs font-bold text-help-strong">
                {helpError.message}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void offerHelp()}
                disabled={helping}
                className="btn-primary min-h-9 px-3.5 py-1.5 text-xs"
              >
                {helping ? (
                  <InlineSpinner className="size-3.5" />
                ) : (
                  <HeartHandshake className="size-3.5" aria-hidden />
                )}
                Quero ajudar
              </button>
              <Link
                href="/responsavel/ajuda"
                onClick={() => {
                  dismissHelpAlert();
                }}
                className="btn-secondary min-h-9 px-3.5 py-1.5 text-xs"
              >
                <LifeBuoy className="size-3.5" aria-hidden />
                Ver pedido
              </Link>
            </div>
          </div>
          <button
            type="button"
            className="icon-button size-8 border-0"
            aria-label="Fechar alerta"
            onClick={() => {
              dismissHelpAlert();
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
