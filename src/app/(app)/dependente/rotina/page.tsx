"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, PencilLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { RoutineFormModal } from "@/components/routine-form";
import { PageHeader, EmptyState, ErrorNote, LoadingBlock } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { InlineSpinner } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { formatDays } from "@/lib/date";
import { useAsync } from "@/lib/hooks/use-async";
import type { RoutineItem } from "@/lib/types";

function periodOf(time: string): "manha" | "tarde" | "noite" {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

const PERIODS = [
  { id: "manha" as const, label: "Manhã", emoji: "☀️", hint: "Até 12h" },
  { id: "tarde" as const, label: "Tarde", emoji: "🌤️", hint: "12h às 18h" },
  { id: "noite" as const, label: "Noite", emoji: "🌙", hint: "Depois das 18h" },
];

export default function DependentRoutinePage() {
  const { backend, activeDependent } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoutineItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loader = useCallback(
    () => (activeDependent ? backend.listRoutineItems(activeDependent.id) : Promise.resolve([])),
    [backend, activeDependent],
  );
  const { data: items, loading, error, reload } = useAsync<RoutineItem[]>(
    loader,
    [backend, activeDependent?.id],
    [],
  );

  const grouped = useMemo(
    () =>
      PERIODS.map((period) => ({
        ...period,
        items: items
          .filter((item) => periodOf(item.startTime) === period.id)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
    [items],
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: RoutineItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await backend.deleteRoutineItem(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "Não foi possível remover a atividade.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!activeDependent) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Minha rotina"
        title="Do meu jeito, no meu tempo"
        description="Monte seu dia com atividades, horários e símbolos que façam sentido para você. Você pode mudar sempre que precisar."
        actions={
          <button type="button" onClick={openNew} className="btn-primary">
            <Plus className="size-4" aria-hidden />
            Nova atividade
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-2xl font-black text-ink">{items.length}</p>
            <p className="text-xs font-bold text-muted">atividades na rotina</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <span className="text-xl" aria-hidden>
              📅
            </span>
          </span>
          <div>
            <p className="font-display text-2xl font-black text-ink">
              {items.filter((item) => item.days.length === 7).length}
            </p>
            <p className="text-xs font-bold text-muted">acontecem todos os dias</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2">
            <span className="text-xl" aria-hidden>
              🕰️
            </span>
          </span>
          <div>
            <p className="font-display text-2xl font-black text-ink">
              {items.length > 0 ? items[0].startTime : "—"}
            </p>
            <p className="text-xs font-bold text-muted">primeira atividade do dia</p>
          </div>
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && items.length === 0 && <LoadingBlock label="Carregando sua rotina…" />}

      {!loading && items.length === 0 ? (
        <EmptyState
          emoji="🧩"
          title="Sua rotina ainda está em branco"
          description="Comece com uma atividade simples, como escovar os dentes ou tomar café. Dá para adicionar mais depois."
          tone="primary"
          action={
            <button type="button" onClick={openNew} className="btn-primary">
              <Plus className="size-4" aria-hidden />
              Criar primeira atividade
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map((period) =>
            period.items.length === 0 ? null : (
              <section key={period.id} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line/80 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-surface-2 text-xl" aria-hidden>
                      {period.emoji}
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-extrabold text-ink">{period.label}</h2>
                      <p className="text-xs font-bold text-muted">{period.hint}</p>
                    </div>
                  </div>
                  <span className="chip">{period.items.length} atividades</span>
                </div>

                <ul className="divide-y divide-line/70">
                  {period.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>
                        {item.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-extrabold text-ink">
                          {item.title}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold text-muted">
                          <span className="text-ink-soft">{item.startTime}</span>
                          <span aria-hidden>·</span>
                          <span>{item.durationMin} min</span>
                          <span aria-hidden>·</span>
                          <span>{formatDays(item.days)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="icon-button size-10"
                          aria-label={`Editar ${item.title}`}
                          title="Editar"
                        >
                          <PencilLine className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(item);
                          }}
                          className="icon-button size-10 hover:border-help/30 hover:bg-help-soft hover:text-help-strong"
                          aria-label={`Remover ${item.title}`}
                          title="Remover"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-3 rounded-3xl bg-primary-soft/50 px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-sm leading-relaxed text-primary-strong">
          Quer ver como está o cumprimento da sua rotina? Acompanhe o seu dia e a sua semana.
        </p>
        <Link href="/dependente" className="btn-secondary shrink-0 text-primary-strong">
          Ver meu dia
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {formOpen && (
        <RoutineFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          dependentId={activeDependent.id}
          item={editing}
          onSaved={reload}
        />
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Remover esta atividade?"
        description="Ela deixa de aparecer na sua rotina. Os registros de dias anteriores continuam guardados."
        size="sm"
      >
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="flex items-center gap-3 font-display text-base font-extrabold text-ink">
            <span className="text-2xl" aria-hidden>
              {deleteTarget?.emoji}
            </span>
            {deleteTarget?.title}
            <span className="ml-auto text-xs font-bold text-muted">{deleteTarget?.startTime}</span>
          </p>
        </div>
        {deleteError && <div className="mt-3"><ErrorNote>{deleteError}</ErrorNote></div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
            Manter atividade
          </button>
          <button
            type="button"
            className="btn bg-help text-white hover:bg-help-strong"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting && <InlineSpinner className="size-4" />}
            Sim, remover
          </button>
        </div>
      </Modal>
    </div>
  );
}
