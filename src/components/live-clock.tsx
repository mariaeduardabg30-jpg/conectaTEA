"use client";

import { Clock } from "lucide-react";
import { useClientNow } from "@/lib/hooks/use-client-now";

/**
 * Relógio local do dispositivo, atualizado a cada segundo. É ele que o app
 * usa para liberar cada atividade no horário certo — o servidor não participa
 * dessa decisão, evitando diferença de fuso.
 */
export function LiveClock() {
  const now = useClientNow(1000);
  const time = now
    ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const seconds = now ? String(now.getSeconds()).padStart(2, "0") : "--";

  return (
    <div
      className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-ink-soft sm:inline-flex sm:gap-2 sm:px-3"
      title="Horário do seu dispositivo"
    >
      <Clock className="hidden size-3.5 shrink-0 text-primary sm:block" aria-hidden />
      <time
        className="font-display text-xs font-extrabold tabular-nums text-ink sm:text-sm"
        dateTime={now ? now.toISOString() : undefined}
        aria-label={now ? `Agora são ${time} e ${seconds} segundos` : "Carregando horário"}
      >
        {time}
        <span className="text-[0.65rem] font-bold text-muted sm:text-xs">:{seconds}</span>
      </time>
    </div>
  );
}
