"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/data/provider";
import { InlineSpinner } from "@/components/ui/page-header";
import { formatLinkCode } from "@/lib/link-code";

/**
 * Cartão de vinculação exibido na conta do dependente. Mostra o código que
 * o responsável deve digitar em "Vincular dependente" para acompanhar a
 * rotina, as emoções e os pedidos de ajuda deste perfil.
 */
export function LinkCodeCard() {
  const { user, activeDependent, backend, refreshDependents, mode } = useApp();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dependent = activeDependent;
  const code = formatLinkCode(dependent?.linkCode ?? null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // O cartão só faz sentido para a conta do próprio dependente ou para o
  // responsável que está acompanhando este espaço pelo dispositivo (área do
  // dependente). Sem isso, o responsável não conseguiria ver/pegar o código
  // para vincular a conta.
  if (!dependent || (user?.role !== "dependente" && user?.role !== "responsavel")) {
    return null;
  }

  const copy = async () => {
    if (!dependent.linkCode) return;
    try {
      await navigator.clipboard.writeText(formatLinkCode(dependent.linkCode));
      setCopied(true);
    } catch {
      // Fallback para navegadores sem a API de clipboard.
      const textarea = document.createElement("textarea");
      textarea.value = formatLinkCode(dependent.linkCode);
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setError("Não foi possível copiar. Anote o código: " + formatLinkCode(dependent.linkCode));
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      await backend.regenerateLinkCode(dependent.id);
      await refreshDependents();
      setConfirming(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível gerar um novo código.",
      );
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <section
      className="card overflow-hidden"
      aria-labelledby="link-code-title"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-md">
          <p className="eyebrow">Vínculo com o responsável</p>
          <h2 id="link-code-title" className="mt-1.5 font-display text-xl font-black text-ink">
            Meu código de vinculação
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            Mostre este código para o seu responsável e peça para ele digitar em{" "}
            <strong>“Vincular dependente”</strong> no aplicativo dele. Assim ele acompanha a sua
            rotina, suas emoções e os seus pedidos de ajuda. Não compartilhe com outras pessoas.
          </p>
        </div>

        <div className="shrink-0">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 px-4 py-3">
            <KeyRound className="size-5 shrink-0 text-primary" aria-hidden />
            <code
              className="select-all font-display text-2xl font-black tracking-[0.18em] text-primary-strong"
              aria-label={`Seu código de vinculação: ${code}`}
            >
              {code || "--------"}
            </code>
            <button
              type="button"
              onClick={() => void copy()}
              className="icon-button size-10"
              aria-label="Copiar código de vinculação"
              title="Copiar código"
            >
              {copied ? (
                <Check className="size-4 text-primary" strokeWidth={3} aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[0.65rem] font-bold text-muted" role="status">
            {copied ? "Código copiado!" : "Toque na cópia para guardar ou ditar o código"}
          </p>

          {confirming ? (
            <div className="mt-2 rounded-2xl border border-line bg-surface p-3 text-center">
              <p className="text-xs font-bold leading-snug text-ink-soft">
                Gerar um código novo? O código atual deixa de funcionar.
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={regenerating}
                  className="btn-secondary min-h-9 px-3 text-xs"
                >
                  Manter
                </button>
                <button
                  type="button"
                  onClick={() => void regenerate()}
                  disabled={regenerating}
                  className="btn-primary min-h-9 px-3 text-xs"
                >
                  {regenerating && <InlineSpinner className="size-3.5" />}
                  Gerar novo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[0.68rem] font-bold text-muted transition hover:text-primary-strong"
            >
              <RefreshCw className="size-3" aria-hidden />
              Gerar um código novo
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="border-t border-help/20 bg-help-soft/60 px-5 py-2.5 text-xs font-bold text-help-strong">
          {error}
        </p>
      )}

      <div className="flex items-start gap-2 border-t border-line/70 bg-surface-2/60 px-5 py-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-[0.68rem] leading-relaxed text-muted">
            Só o seu responsável, com este código, consegue acompanhar o seu espaço. Se você achar
            que alguém viu o código sem autorização, gere um novo acima.
          </p>
          {mode === "demo" && (
            <p className="mt-1 text-[0.68rem] font-bold leading-relaxed text-accent">
              Modo demonstração: este código só funciona no mesmo navegador onde esta conta foi
              criada. Para vincular de outro aparelho, configure o Supabase.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
