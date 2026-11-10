"use client";

import { useEffect, useState } from "react";
import { CloudOff, CloudUpload } from "lucide-react";
import { outboxCount } from "@/lib/data/offline";

/**
 * Avisa quando o app está sem internet (e continua mostrando os dados salvos)
 * e quando há ações esperando para serem enviadas.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const sync = () => {
      setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
      setPending(outboxCount());
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("conectatea:outbox", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("conectatea:outbox", sync);
    };
  }, []);

  if (!offline && pending === 0) return null;

  const message = offline
    ? pending > 0
      ? `Você está sem conexão. ${pending} ${
          pending === 1 ? "alteração salva" : "alterações salvas"
        } neste dispositivo ${
          pending === 1 ? "será enviada" : "serão enviadas"
        } quando a internet voltar.`
      : "Você está sem conexão. Mostrando os dados salvos neste dispositivo — tudo volta ao normal quando a internet retornar."
    : `Sincronizando ${pending} ${pending === 1 ? "alteração" : "alterações"}…`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-bold leading-relaxed text-ink-soft shadow-lift">
        {offline ? (
          <CloudOff className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        ) : (
          <CloudUpload className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        )}
        <p>{message}</p>
      </div>
    </div>
  );
}
