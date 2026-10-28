"use client";

import { useEffect, useState } from "react";

/**
 * Retorna a data atual apenas depois da hidratação, evitando divergências
 * entre o horário do servidor e o do navegador.
 */
export function useClientNow(intervalMs = 60_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let interval: number | undefined;
    // Agenda a primeira leitura para depois da hidratação.
    const kickoff = window.setTimeout(() => {
      setNow(new Date());
      if (intervalMs > 0) {
        interval = window.setInterval(() => setNow(new Date()), intervalMs);
      }
    }, 0);
    return () => {
      window.clearTimeout(kickoff);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
