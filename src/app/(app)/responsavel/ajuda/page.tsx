"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCheck,
  Clock,
  Info,
  LifeBuoy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PageHeader, EmptyState, ErrorNote } from "@/components/ui/page-header";
import { InlineSpinner } from "@/components/ui/page-header";
import { playHelpAlert } from "@/lib/audio/alerts";
import { setAlertSoundEnabled, useAlertSound } from "@/lib/audio/preferences";
import { useApp } from "@/lib/data/provider";
import { formatDateTime, formatRelative } from "@/lib/date";
import { useHelpRequests } from "@/lib/hooks/use-help-requests";
import { readableTextColor } from "@/lib/theme";

export default function ResponsibleHelpPage() {
  const { backend, user, dependents, activeDependent } = useApp();
  const [filter, setFilter] = useState<string>("all");
  const [acking, setAcking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const soundEnabled = useAlertSound();

  const {
    data: allRequests,
    loading,
    error: loadError,
    reload,
  } = useHelpRequests();
  const activeFilter =
    filter === "all" || dependents.some((dependent) => dependent.id === filter)
      ? filter
      : "all";
  const requests =
    activeFilter === "all"
      ? allRequests
      : allRequests.filter((request) => request.dependentId === activeFilter);
  const pending = requests.filter((request) => !request.acknowledgedAt);
  const history = requests.filter((request) => request.acknowledgedAt);

  const dependentById = new Map(dependents.map((dependent) => [dependent.id, dependent]));

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const acknowledge = async (id: string) => {
    setAcking(id);
    setError(null);
    try {
      await backend.acknowledgeHelpRequest(id, user?.name ?? "Responsável");
      setNotice("Pedido reconhecido. O dependente já pode ser acolhido.");
      reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível reconhecer o pedido.",
      );
    } finally {
      setAcking(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pedidos de ajuda"
        title="Quando alguém precisa, você fica sabendo"
        description="Cada acionamento é registrado com quem pediu e o horário. Reconheça o pedido depois de oferecer o acolhimento."
        actions={
          <Link href="/responsavel" className="btn-secondary">
            Voltar para a visão geral
          </Link>
        }
      />

      {loadError && <ErrorNote>{loadError}</ErrorNote>}
      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary-strong"
        >
          <CheckCheck className="size-4" aria-hidden />
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar pedidos por dependente">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={activeFilter === "all"}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-extrabold transition ${
            activeFilter === "all"
              ? "border-primary bg-primary text-white"
              : "border-line bg-surface text-ink-soft hover:border-primary/30"
          }`}
        >
          Toda a família
        </button>
        {dependents.map((dependent) => {
          const active = activeFilter === dependent.id;
          const count = requests.filter(
            (request) => request.dependentId === dependent.id && !request.acknowledgedAt,
          ).length;
          return (
            <button
              key={dependent.id}
              type="button"
              onClick={() => setFilter(dependent.id)}
              aria-pressed={active}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-extrabold transition ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-ink-soft hover:border-primary/30"
              }`}
            >
              <span aria-hidden>{dependent.avatar}</span>
              {dependent.name}
              {count > 0 && (
                <span
                  className={`flex min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] ${
                    active ? "bg-white/25" : "bg-help-soft text-help-strong"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          <section
            aria-labelledby="pendentes-titulo"
            className={`overflow-hidden rounded-[28px] border p-4 sm:p-5 ${
              pending.length > 0
                ? "border-help/30 bg-help-soft/60"
                : "border-primary/20 bg-primary-soft/40"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-11 items-center justify-center rounded-full ${
                    pending.length > 0 ? "bg-help text-white" : "bg-primary text-white"
                  }`}
                >
                  <BellRing className="size-5" aria-hidden />
                </span>
                <div>
                  <h2
                    id="pendentes-titulo"
                    className={`font-display text-xl font-black ${
                      pending.length > 0 ? "text-help-strong" : "text-primary-strong"
                    }`}
                  >
                    {pending.length > 0
                      ? `${pending.length} ${pending.length === 1 ? "pedido aguardando" : "pedidos aguardando"}`
                      : "Nenhum pedido pendente"}
                  </h2>
                  <p className="text-xs font-bold text-muted">
                    {pending.length > 0
                      ? "Reconheça depois de ir até o dependente."
                      : "Tudo foi reconhecido. Respire com tranquilidade."}
                  </p>
                </div>
              </div>
              {pending.length > 0 && (
                <span className="rounded-full bg-help px-3 py-1 text-xs font-extrabold text-white">
                  Ação necessária
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {loading && requests.length === 0 ? (
                <div className="rounded-2xl bg-surface p-4">
                  <InlineSpinner className="size-5 text-primary" />
                  <span className="ml-2 text-sm font-bold text-muted">Carregando pedidos…</span>
                </div>
              ) : pending.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4">
                  <CheckCheck className="size-6 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Nenhum pedido aguardando reconhecimento
                    {activeFilter === "all" ? " nesta família" : " para este dependente"}. Novos pedidos
                    aparecem aqui em tempo real.
                  </p>
                </div>
              ) : (
                pending.map((request) => {
                  const dependent = dependentById.get(request.dependentId);
                  return (
                    <article
                      key={request.id}
                      className="rounded-3xl border border-help/20 bg-surface p-4 shadow-card"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl"
                            style={{
                              backgroundColor: dependent?.color ?? "#F4AAA3",
                              color: readableTextColor(dependent?.color ?? "#F4AAA3"),
                            }}
                            aria-hidden
                          >
                            {dependent?.avatar ?? "🆘"}
                          </span>
                          <div>
                            <h3 className="font-display text-lg font-extrabold text-ink">
                              {dependent?.name ?? "Dependente"} pediu ajuda
                            </h3>
                            <p className="flex flex-wrap items-center gap-x-2 text-xs font-bold text-muted">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3.5" aria-hidden />
                                {formatDateTime(request.createdAt)}
                              </span>
                              <span aria-hidden>·</span>
                              <span>{formatRelative(request.createdAt)}</span>
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-help-soft px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wider text-help-strong">
                          Pendente
                        </span>
                      </div>

                      {request.message && (
                        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                          “{request.message}”
                        </p>
                      )}

                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[0.68rem] font-bold text-muted">
                          Vá até {dependent?.name ?? "o dependente"} e ofereça apoio antes de
                          reconhecer.
                        </p>
                        <button
                          type="button"
                          onClick={() => acknowledge(request.id)}
                          disabled={acking === request.id}
                          className="btn-help min-h-10 px-4 text-xs"
                        >
                          {acking === request.id ? (
                            <InlineSpinner className="size-3.5" />
                          ) : (
                            <LifeBuoy className="size-3.5" aria-hidden />
                          )}
                          Reconhecer pedido
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="historico-ajuda">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/80 px-5 py-4">
              <div>
                <p className="eyebrow">Histórico</p>
                <h2 id="historico-ajuda" className="mt-1 font-display text-xl font-black text-ink">
                  Pedidos reconhecidos
                </h2>
              </div>
              <span className="chip">{history.length} registros</span>
            </div>

            {loading && requests.length === 0 ? (
              <div className="px-5 py-6">
                <InlineSpinner className="size-5 text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                Os pedidos reconhecidos aparecerão aqui com data, horário e quem confirmou.
              </div>
            ) : (
              <ul className="divide-y divide-line/70">
                {history.map((request) => {
                  const dependent = dependentById.get(request.dependentId);
                  return (
                    <li key={request.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
                        style={{
                          backgroundColor: dependent?.color ?? "#DCEDE7",
                          color: readableTextColor(dependent?.color ?? "#DCEDE7"),
                        }}
                        aria-hidden
                      >
                        {dependent?.avatar ?? "✅"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-ink">
                          {dependent?.name ?? "Dependente"}
                        </p>
                        <p className="text-[0.68rem] font-bold text-muted">
                          Pedido em {formatDateTime(request.createdAt)}
                          {request.acknowledgedAt
                            ? ` · reconhecido em ${formatDateTime(request.acknowledgedAt)}`
                            : ""}
                        </p>
                        {request.acknowledgedBy && (
                          <p className="mt-0.5 text-[0.68rem] text-muted">
                            Por {request.acknowledgedBy}
                          </p>
                        )}
                        {request.message && (
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                            “{request.message}”
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[0.6rem] font-extrabold text-primary-strong">
                        Reconhecido
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                {soundEnabled ? (
                  <Volume2 className="size-4" aria-hidden />
                ) : (
                  <VolumeX className="size-4" aria-hidden />
                )}
              </span>
              <h2 className="font-display text-lg font-extrabold text-ink">Alerta sonoro</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Quando um novo pedido chega com esta aba aberta, um som acolhedor toca. O alerta
              visual continua mesmo com o som desligado.
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3.5 py-3">
              <div>
                <p className="text-xs font-extrabold text-ink">
                  {soundEnabled ? "Som ativado" : "Som desativado"}
                </p>
                <p className="text-[0.65rem] text-muted">Preferência deste navegador</p>
              </div>
              <button
                type="button"
                onClick={() => setAlertSoundEnabled(!soundEnabled)}
                aria-pressed={soundEnabled}
                className={`relative h-7 w-12 rounded-full transition ${
                  soundEnabled ? "bg-primary" : "bg-line-strong"
                }`}
                aria-label={soundEnabled ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
              >
                <span
                  className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
                    soundEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!soundEnabled) setAlertSoundEnabled(true);
                void playHelpAlert();
              }}
              className="btn-secondary mt-2 w-full text-xs"
            >
              <Volume2 className="size-4" aria-hidden />
              Testar som do alerta
            </button>
          </section>

          <section className="rounded-3xl bg-primary-soft/60 p-5">
            <Info className="size-5 text-primary" aria-hidden />
            <h2 className="mt-2 font-display text-lg font-extrabold text-primary-strong">
              Como agir
            </h2>
            <ol className="mt-2.5 space-y-2 text-xs leading-relaxed text-primary-strong/90">
              <li>
                <strong>1.</strong> Vá até o dependente e ofereça presença, sem exigir explicação.
              </li>
              <li>
                <strong>2.</strong> Reduza estímulos: som, luz forte, muita gente ao redor.
              </li>
              <li>
                <strong>3.</strong> Só depois de acolher, toque em “Reconhecer pedido”.
              </li>
            </ol>
          </section>

          {activeDependent && (
            <Link
              href="/responsavel/emocoes"
              className="card block p-5 transition hover:-translate-y-0.5"
            >
              <p className="eyebrow">Contexto</p>
              <h2 className="mt-1 font-display text-base font-extrabold text-ink">
                Ver emoções de {activeDependent.name}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                O que foi registrado antes e depois do pedido de ajuda pode ajudar a entender o
                momento.
              </p>
            </Link>
          )}

          {pending.length === 0 && history.length === 0 && (
            <div className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5">
              <EmptyState
                emoji="🤝"
                title="Sem pedidos ainda"
                description="Assim que um dependente acionar o botão de ajuda, o registro aparece aqui."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
