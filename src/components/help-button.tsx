"use client";

import { useState } from "react";
import { Check, HeartHandshake, LifeBuoy } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { InlineSpinner } from "@/components/ui/page-header";
import { playConfirmationTone } from "@/lib/audio/alerts";
import { useApp } from "@/lib/data/provider";
import { formatTime } from "@/lib/date";

export function HelpButton() {
  const { backend, activeDependent } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!activeDependent) return null;

  const send = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const request = await backend.createHelpRequest(activeDependent.id);
      setConfirming(false);
      setSentAt(request.createdAt);
      void playConfirmationTone();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível enviar o pedido. Tente novamente.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
        {error && (
          <p
            role="alert"
            className="max-w-64 rounded-2xl bg-help-soft px-3.5 py-2.5 text-xs font-bold text-help-strong shadow-card"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="help-halo group flex min-h-14 items-center gap-2.5 rounded-full bg-help px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:bg-help-strong active:scale-[0.98] sm:min-h-16 sm:px-6 sm:text-base"
          aria-label="Pedir ajuda ao responsável agora"
        >
          <LifeBuoy className="size-6 transition group-hover:rotate-12" aria-hidden />
          <span className="pr-1">Preciso de ajuda</span>
        </button>
      </div>

      <Modal
        open={confirming}
        onClose={() => {
          if (!sending) setConfirming(false);
        }}
        title="Pedir ajuda agora?"
        description="Seu responsável vai receber um aviso neste instante."
        size="sm"
      >
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-help-soft text-help">
            <LifeBuoy className="size-8" aria-hidden />
          </span>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-ink-soft">
            Toque em <strong className="text-ink">“Sim, preciso de ajuda”</strong> para avisar. Se
            foi um toque sem querer, escolha “Agora não”.
          </p>
          {error && (
            <p role="alert" className="mt-3 rounded-2xl bg-help-soft px-3.5 py-2.5 text-xs font-bold text-help-strong">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={sending}
              className="btn-secondary flex-1"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending}
              className="btn-help flex-1"
            >
              {sending ? <InlineSpinner className="size-4" /> : <LifeBuoy className="size-4" aria-hidden />}
              {sending ? "Enviando…" : "Sim, preciso de ajuda"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={sentAt !== null}
        onClose={() => setSentAt(null)}
        title="Ajuda enviada"
        size="sm"
      >
        <div className="flex flex-col items-center py-2 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Check className="size-10" aria-hidden strokeWidth={3} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-black text-ink">Estamos com você</h3>
          <p className="mt-2 max-w-sm text-[0.98rem] leading-relaxed text-ink-soft">
            Seu responsável foi avisado e vai até você. Se puder, respire fundo e espere um
            pouquinho.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-1.5 text-xs font-bold text-muted">
            <HeartHandshake className="size-4" aria-hidden />
            Pedido enviado às {formatTime(sentAt ?? new Date())}
          </p>
          <button type="button" onClick={() => setSentAt(null)} className="btn-primary mt-6 w-full">
            Entendi
          </button>
        </div>
      </Modal>
    </>
  );
}
