"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  PencilLine,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { DependentFormModal } from "@/components/dependent-form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorNote, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { InlineSpinner } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { readableTextColor, withAlpha } from "@/lib/theme";
import type { Dependent } from "@/lib/types";

function ageLabel(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 0) return null;
  return age === 1 ? "1 ano" : `${age} anos`;
}

export default function DependentsPage() {
  const router = useRouter();
  const {
    backend,
    dependents,
    dependentsLoaded,
    activeDependent,
    setActiveDependentId,
    refreshDependents,
  } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dependent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (dependent: Dependent) => {
    setEditing(dependent);
    setFormOpen(true);
  };

  const openDependentArea = (id: string) => {
    setActiveDependentId(id);
    router.push("/dependente");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await backend.deleteDependent(deleteTarget.id);
      setNotice(`Perfil de ${deleteTarget.name} removido.`);
      setDeleteTarget(null);
      await refreshDependents();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível remover o perfil.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!dependentsLoaded) return <LoadingBlock label="Carregando perfis…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dependentes"
        title="Cada pessoa, um espaço próprio"
        description="Crie e organize os perfis da família. Cada dependente tem sua própria rotina, registros emocionais e histórico de ajuda."
        actions={
          <button type="button" onClick={openNew} className="btn-primary">
            <Plus className="size-4" aria-hidden />
            Novo dependente
          </button>
        }
      />

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary-strong"
        >
          <ShieldCheck className="size-4" aria-hidden />
          {notice}
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      {dependents.length === 0 ? (
        <div className="card p-6 sm:p-10">
          <EmptyState
            emoji="🌱"
            title="Nenhum perfil por aqui ainda"
            description="Adicione a primeira pessoa para começar a organizar a rotina e acompanhar as emoções."
            tone="primary"
            action={
              <button type="button" onClick={openNew} className="btn-primary">
                <Plus className="size-4" aria-hidden />
                Criar primeiro perfil
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dependents.map((dependent) => {
            const age = ageLabel(dependent.birthDate);
            const selected = activeDependent?.id === dependent.id;
            return (
              <article
                key={dependent.id}
                className="card overflow-hidden"
                style={{
                  background: `linear-gradient(160deg, ${withAlpha(dependent.color, 0.28)} 0%, #FFFCF6 52%)`,
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="flex size-16 items-center justify-center rounded-full text-4xl shadow-card"
                      style={{
                        backgroundColor: dependent.color,
                        color: readableTextColor(dependent.color),
                      }}
                      aria-hidden
                    >
                      {dependent.avatar}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(dependent)}
                        className="icon-button size-9 bg-white/70"
                        aria-label={`Editar perfil de ${dependent.name}`}
                        title="Editar perfil"
                      >
                        <PencilLine className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setDeleteTarget(dependent);
                        }}
                        className="icon-button size-9 bg-white/70 hover:border-help/30 hover:bg-help-soft hover:text-help-strong"
                        aria-label={`Remover perfil de ${dependent.name}`}
                        title="Remover perfil"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-black text-ink">{dependent.name}</h2>
                      {selected && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-white">
                          Em foco
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-muted">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {age ?? "Data de nascimento não informada"}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openDependentArea(dependent.id)}
                      className="btn-primary min-h-10 flex-1 px-4 text-xs"
                    >
                      <Sparkles className="size-3.5" aria-hidden />
                      Abrir área
                    </button>
                    <Link
                      href="/responsavel/emocoes"
                      onClick={() => setActiveDependentId(dependent.id)}
                      className="btn-secondary min-h-10 px-3 text-xs"
                      aria-label={`Ver emoções de ${dependent.name}`}
                    >
                      Emoções
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

          <button
            type="button"
            onClick={openNew}
            className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-line-strong bg-surface/50 p-5 text-center transition hover:border-primary/40 hover:bg-primary-soft/30"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-primary">
              <Plus className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-base font-extrabold text-ink">
                Adicionar dependente
              </span>
              <span className="mt-0.5 block text-xs text-muted">Um novo espaço, do jeito da pessoa</span>
            </span>
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-primary-soft/50 p-5">
          <Users className="size-5 text-primary" aria-hidden />
          <h2 className="mt-2 font-display text-lg font-extrabold text-primary-strong">
            Uma conta, vários perfis
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-primary-strong/90">
            O responsável acompanha todos os dependentes. Cada um vê apenas o próprio espaço ao
            escolher seu nome na tela de entrada.
          </p>
        </div>
        <div className="rounded-3xl bg-accent-soft/70 p-5">
          <ShieldCheck className="size-5 text-accent" aria-hidden />
          <h2 className="mt-2 font-display text-lg font-extrabold text-ink">
            Privacidade e cuidado
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            Ao remover um perfil, a rotina, os registros emocionais e os pedidos de ajuda daquela
            pessoa também são apagados. Essa ação não pode ser desfeita.
          </p>
        </div>
      </div>

      {formOpen && (
        <DependentFormModal
          key={editing?.id ?? "new"}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          dependent={editing}
          onSaved={() => {
            void refreshDependents();
            setNotice(editing ? "Perfil atualizado." : "Perfil criado com sucesso.");
          }}
        />
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Remover o perfil de ${deleteTarget?.name ?? "dependente"}?`}
        description="Todos os dados vinculados a esta pessoa serão apagados."
        size="sm"
      >
        <div className="rounded-2xl bg-help-soft px-4 py-3 text-sm leading-relaxed text-help-strong">
          A rotina, os registros de emoções e o histórico de pedidos de ajuda serão removidos
          permanentemente.
        </div>
        {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
            Manter perfil
          </button>
          <button
            type="button"
            className="btn bg-help text-white hover:bg-help-strong"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting && <InlineSpinner className="size-4" />}
            Remover definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}
