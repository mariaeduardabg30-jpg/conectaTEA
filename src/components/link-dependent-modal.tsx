"use client";

import { useState } from "react";
import { Link2, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ErrorNote, InlineSpinner } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";

/**
 * Fluxo "Vincular dependente": o responsável digita o código exibido na
 * conta do dependente e as duas contas passam a se enxergar.
 */
export function LinkDependentModal({
  open,
  onClose,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  onLinked: (name: string) => void;
}) {
  const { backend, refreshDependents, mode } = useApp();
  const [value, setValue] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatted = (() => {
    const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
    return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
  })();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const clean = event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
    setValue(clean);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = formatted.replace(/-/g, "");
    if (clean.length !== 8) {
      setError("Digite o código completo (8 caracteres).");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const dependent = await backend.linkDependentByCode(clean);
      await refreshDependents();
      onClose();
      onLinked(dependent.name);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível vincular. Confira o código e tente novamente.",
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!connecting) onClose();
      }}
      title="Vincular dependente"
      description="Digite o código de vinculação que aparece na conta do dependente."
      size="sm"
    >
      <form className="space-y-4" onSubmit={submit}>
        {mode === "demo" && (
          <div className="rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3">
            <p className="text-xs font-extrabold text-accent">Modo demonstração</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Aqui as contas ficam salvas apenas neste navegador. O código funciona quando o
              dependente usa <strong>o mesmo navegador</strong> — para vincular de outro celular ou
              computador é preciso configurar o Supabase (veja o README).
            </p>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-2xl bg-primary-soft/50 px-4 py-3">
          <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <ol className="list-none space-y-1 text-xs leading-relaxed text-primary-strong">
            <li>
              <strong>1.</strong> Peça para o dependente abrir a conta dele e tocar em{" "}
              <strong>Meu dia → Meu código de vinculação</strong>.
            </li>
            <li>
              <strong>2.</strong> Digite o código abaixo (ou cole, se estiver usando este
              dispositivo).
            </li>
            <li>
              <strong>3.</strong> Pronto: você passa a acompanhar rotina, emoções, tarefas e
              pedidos de ajuda, com avisos neste app.
            </li>
          </ol>
        </div>

        <div>
          <label htmlFor="link-code" className="label">
            Código de vinculação
          </label>
          <input
            id="link-code"
            name="link-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            className="input text-center font-display text-2xl font-black tracking-[0.22em] uppercase"
            placeholder="0000-0000"
            value={formatted}
            onChange={handleChange}
            maxLength={9}
            aria-describedby="link-code-hint"
          />
          <p id="link-code-hint" className="mt-1.5 text-xs text-muted">
            São 8 caracteres, como <span className="font-bold">AB3K-X7QM</span>. Letras e números
            parecidos nunca são usados.
          </p>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={connecting}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={connecting || formatted.replace(/-/g, "").length !== 8}
            className="btn-primary"
          >
            {connecting ? <InlineSpinner className="size-4" /> : <Link2 className="size-4" aria-hidden />}
            {connecting ? "Vinculando…" : "Vincular"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
