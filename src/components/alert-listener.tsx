"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BellRing, LifeBuoy, Volume2, X } from "lucide-react";
import { useApp } from "@/lib/data/provider";
import { playHelpAlert } from "@/lib/audio/alerts";
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
  const { latestHelp, dependents, dismissHelpAlert } = useApp();
  const soundEnabled = useAlertSound();
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!latestHelp) return;
    if (soundEnabledRef.current) void playHelpAlert();
    const timer = window.setTimeout(() => dismissHelpAlert(), 30000);
    return () => window.clearTimeout(timer);
  }, [latestHelp, dismissHelpAlert]);

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
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/responsavel/ajuda"
                onClick={() => {
                  dismissHelpAlert();
                }}
                className="btn-primary min-h-9 px-3.5 py-1.5 text-xs"
              >
                <LifeBuoy className="size-3.5" aria-hidden />
                Ver pedido
              </Link>
              <button
                type="button"
                onClick={() => {
                  dismissHelpAlert();
                }}
                className="btn-secondary min-h-9 px-3.5 py-1.5 text-xs"
              >
                Depois
              </button>
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
