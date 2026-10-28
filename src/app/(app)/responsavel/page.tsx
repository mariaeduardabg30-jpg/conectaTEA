"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  Check,
  HeartHandshake,
  HeartPulse,
  LifeBuoy,
  Plus,
  Users,
} from "lucide-react";
import { EmotionBadge } from "@/components/emotion-badge";
import { EmotionSummary } from "@/components/emotion-summary";
import { EmptyState, ErrorNote, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WeeklyBars } from "@/components/weekly-bars";
import { useApp } from "@/lib/data/provider";
import {
  addDays,
  formatDateTime,
  formatLongDate,
  formatRelative,
  getWeekDays,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import { getEmotion } from "@/lib/emotions";
import { useAsync } from "@/lib/hooks/use-async";
import { useClientNow } from "@/lib/hooks/use-client-now";
import { useHelpRequests } from "@/lib/hooks/use-help-requests";
import { readableTextColor } from "@/lib/theme";
import type { EmotionLog, RoutineItem, TaskCompletion } from "@/lib/types";

type DependentData = {
  items: RoutineItem[];
  completions: TaskCompletion[];
  emotions: EmotionLog[];
};

type FamilyData = Record<string, DependentData>;

const EMPTY_DEPENDENT_DATA: DependentData = { items: [], completions: [], emotions: [] };

export default function ResponsibleDashboardPage() {
  const { backend, dependents, dependentsLoaded, activeDependent, setActiveDependentId } =
    useApp();
  const now = useClientNow();
  const todayKey = now ? toDateKey(now) : "";
  const dependentIds = dependents.map((dependent) => dependent.id).join("|");
  const { data: helpRequests } = useHelpRequests();

  const loader = useCallback(async (): Promise<FamilyData> => {
    if (!now || dependents.length === 0) return {};
    const current = new Date();
    const weekStart = startOfWeek(current);
    const from = toDateKey(weekStart);
    const to = toDateKey(addDays(weekStart, 6));
    const emotionsFrom = addDays(current, -7).toISOString();

    const entries = await Promise.all(
      dependents.map(async (dependent) => {
        const [items, completions, emotions] = await Promise.all([
          backend.listRoutineItems(dependent.id),
          backend.listCompletions(dependent.id, from, to),
          backend.listEmotions(dependent.id, emotionsFrom),
        ]);
        return [dependent.id, { items, completions, emotions }] as const;
      }),
    );
    return Object.fromEntries(entries);
  }, [backend, dependents, now]);

  const { data: familyData, loading, error } = useAsync<FamilyData>(
    loader,
    [backend, dependentIds, todayKey],
    {},
  );

  const pendingRequests = helpRequests.filter((request) => !request.acknowledgedAt);
  const activeData = activeDependent
    ? (familyData[activeDependent.id] ?? EMPTY_DEPENDENT_DATA)
    : EMPTY_DEPENDENT_DATA;

  const weekDays = useMemo(() => {
    if (!now) return [];
    return getWeekDays(now).map((date) => {
      const key = toDateKey(date);
      const scheduled = activeData.items.filter((item) => item.days.includes(date.getDay()));
      const done = scheduled.filter((item) =>
        activeData.completions.some(
          (completion) => completion.date === key && completion.routineItemId === item.id,
        ),
      ).length;
      return { date, done, total: scheduled.length };
    });
  }, [activeData, now]);

  const todayItems = useMemo(() => {
    if (!now) return [];
    return activeData.items
      .filter((item) => item.days.includes(now.getDay()))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activeData.items, now]);

  const todayDoneIds = useMemo(
    () =>
      new Set(
        activeData.completions
          .filter((completion) => completion.date === todayKey)
          .map((completion) => completion.routineItemId),
      ),
    [activeData.completions, todayKey],
  );
  const todayDone = todayItems.filter((item) => todayDoneIds.has(item.id)).length;

  const weekTotal = weekDays.reduce((total, day) => total + day.total, 0);
  const weekDone = weekDays.reduce((total, day) => total + day.done, 0);
  const weekPercent = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const activePending = pendingRequests.filter(
    (request) => request.dependentId === activeDependent?.id,
  ).length;

  const dependentById = new Map(dependents.map((dependent) => [dependent.id, dependent]));

  const focusDependent = (id: string) => {
    setActiveDependentId(id);
    window.setTimeout(() => {
      document.getElementById("detalhes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  if (!dependentsLoaded) {
    return <LoadingBlock label="Carregando visão da família…" />;
  }

  if (dependents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Área do responsável"
          title="Vamos criar o primeiro perfil?"
          description="Cada dependente tem seu próprio espaço de rotina, emoções e sons. Comece adicionando uma pessoa para acompanhar."
        />
        <div className="card p-6 sm:p-10">
          <EmptyState
            emoji="🌱"
            title="Nenhum dependente cadastrado"
            description="Assim que você criar um perfil, os registros de rotina, emoções e pedidos de ajuda aparecerão aqui."
            tone="primary"
            action={
              <Link href="/responsavel/dependentes" className="btn-primary">
                <Plus className="size-4" aria-hidden />
                Criar primeiro perfil
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Área do responsável"
        title="Visão geral da família"
        description={`Acompanhe o dia de ${dependents.map((dependent) => dependent.name).join(", ")} com mais previsibilidade e menos cobrança.`}
        actions={
          <Link href="/responsavel/dependentes" className="btn-secondary">
            <Users className="size-4" aria-hidden />
            Gerenciar perfis
          </Link>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {pendingRequests.length > 0 && (
        <section
          role="alert"
          aria-live="assertive"
          className="overflow-hidden rounded-[28px] bg-help text-white shadow-lift"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 px-5 py-3">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]">
              <BellRing className="size-4" aria-hidden />
              {pendingRequests.length === 1
                ? "1 pedido de ajuda aguardando"
                : `${pendingRequests.length} pedidos de ajuda aguardando`}
            </p>
            <Link
              href="/responsavel/ajuda"
              className="btn min-h-9 bg-white px-3.5 py-1.5 text-xs text-help-strong hover:bg-white/90"
            >
              Ver e reconhecer
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-white/15">
            {pendingRequests.slice(0, 3).map((request) => {
              const dependent = dependentById.get(request.dependentId);
              return (
                <li key={request.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
                    style={{
                      backgroundColor: dependent?.color ?? "#F4AAA3",
                      color: readableTextColor(dependent?.color ?? "#F4AAA3"),
                    }}
                    aria-hidden
                  >
                    {dependent?.avatar ?? "🆘"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">
                      {dependent?.name ?? "Dependente"} pediu ajuda
                    </p>
                    <p className="text-xs text-white/80">
                      {formatRelative(request.createdAt)}
                      {request.message ? ` · “${request.message}”` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="perfis-titulo">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Quem está por aqui</p>
            <h2 id="perfis-titulo" className="mt-1 font-display text-xl font-black text-ink">
              Dependentes
            </h2>
          </div>
          <p className="hidden text-xs font-bold text-muted sm:block">
            Toque em um perfil para ver os detalhes
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dependents.map((dependent) => {
            const data = familyData[dependent.id] ?? EMPTY_DEPENDENT_DATA;
            const scheduled = now
              ? data.items.filter((item) => item.days.includes(now.getDay()))
              : [];
            const completed = scheduled.filter((item) =>
              data.completions.some(
                (completion) =>
                  completion.date === todayKey && completion.routineItemId === item.id,
              ),
            ).length;
            const lastEmotion = data.emotions[0];
            const pending = pendingRequests.filter(
              (request) => request.dependentId === dependent.id,
            ).length;
            const selected = activeDependent?.id === dependent.id;
            const percent = scheduled.length > 0 ? Math.round((completed / scheduled.length) * 100) : 0;

            return (
              <article
                key={dependent.id}
                className={`card p-4 transition ${
                  selected ? "border-primary/40 ring-2 ring-primary/10" : "hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl"
                    style={{
                      backgroundColor: dependent.color,
                      color: readableTextColor(dependent.color),
                    }}
                    aria-hidden
                  >
                    {dependent.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-extrabold text-ink">
                      {dependent.name}
                    </h3>
                    <p className="text-[0.68rem] font-bold text-muted">
                      {selected ? "Em acompanhamento agora" : "Toque para acompanhar"}
                    </p>
                  </div>
                  {pending > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-help-soft px-2 py-1 text-[0.62rem] font-extrabold text-help-strong">
                      <LifeBuoy className="size-3" aria-hidden />
                      {pending}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[0.68rem] font-bold text-muted">
                    <span>Rotina de hoje</span>
                    <span className="text-ink-soft">
                      {completed}/{scheduled.length}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-2">
                  {lastEmotion ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <EmotionBadge emotionId={lastEmotion.emotion} size="sm" />
                      <span className="truncate text-[0.65rem] font-bold text-muted">
                        {formatRelative(lastEmotion.createdAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[0.68rem] font-bold text-muted">Sem emoções registradas</span>
                  )}
                  <button
                    type="button"
                    onClick={() => focusDependent(dependent.id)}
                    className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.68rem] font-extrabold transition ${
                      selected
                        ? "bg-primary-soft text-primary-strong"
                        : "bg-surface-2 text-ink-soft hover:bg-primary hover:text-white"
                    }`}
                  >
                    {selected ? "Em foco" : "Ver"}
                    <ArrowRight className="size-3" aria-hidden />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {activeDependent && (
        <div id="detalhes" className="grid scroll-mt-24 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Rotina de hoje</p>
                  <h2 className="mt-1 font-display text-2xl font-black text-ink">
                    O dia de {activeDependent.name}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {now ? formatLongDate(now) : ""}
                  </p>
                </div>
                <Link href="/responsavel/rotina" className="btn-secondary min-h-9 px-3.5 py-1.5 text-xs">
                  Ver semana
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>

              {loading && familyData[activeDependent.id] === undefined ? (
                <div className="mt-5">
                  <LoadingBlock label="Carregando rotina…" />
                </div>
              ) : (
                <>
                  <div className="mt-5 flex items-center gap-4 rounded-2xl bg-surface-2 p-3.5">
                    <ProgressRing
                      done={todayDone}
                      total={todayItems.length}
                      size={86}
                      color={activeDependent.color}
                      label={`${todayDone} de ${todayItems.length} atividades concluídas hoje`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-ink">
                        {todayItems.length === 0
                          ? "Nenhuma atividade programada"
                          : todayDone === todayItems.length
                            ? "Tudo concluído por hoje"
                            : `${todayItems.length - todayDone} ${todayItems.length - todayDone === 1 ? "atividade pendente" : "atividades pendentes"}`}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {todayItems.length === 0
                          ? "A rotina deste dia está livre."
                          : "Acompanhe sem cobrar. O ritmo é de quem está fazendo."}
                      </p>
                    </div>
                  </div>

                  {todayItems.length === 0 ? (
                    <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-5 text-center text-sm text-muted">
                      Nenhuma atividade para hoje.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {todayItems.map((item) => {
                        const done = todayDoneIds.has(item.id);
                        return (
                          <li
                            key={item.id}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                              done ? "border-primary/20 bg-primary-soft/40" : "border-line bg-surface"
                            }`}
                          >
                            <span
                              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                                done ? "bg-primary text-white" : "border border-line-strong bg-surface text-muted"
                              }`}
                              aria-hidden
                            >
                              {done ? <Check className="size-4" strokeWidth={3} /> : <span className="text-sm">{item.emoji}</span>}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate text-sm font-bold ${
                                  done ? "text-muted line-through" : "text-ink"
                                }`}
                              >
                                {item.title}
                              </p>
                              <p className="text-[0.65rem] font-bold text-muted">{item.startTime}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold ${
                                done
                                  ? "bg-primary-soft text-primary-strong"
                                  : "bg-surface-2 text-muted"
                              }`}
                            >
                              {done ? "Concluída" : "Pendente"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Emoções da semana</p>
                  <h2 className="mt-1 font-display text-2xl font-black text-ink">
                    Como {activeDependent.name} está se sentindo
                  </h2>
                </div>
                <Link
                  href="/responsavel/emocoes"
                  className="btn-secondary min-h-9 px-3.5 py-1.5 text-xs"
                >
                  <HeartPulse className="size-3.5" aria-hidden />
                  Ver registros
                </Link>
              </div>

              <div className="mt-4">
                <EmotionSummary logs={activeData.emotions} emptyLabel="Nenhuma emoção registrada nos últimos 7 dias." />
              </div>

              {activeData.emotions.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
                    Últimos registros
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {activeData.emotions.slice(0, 3).map((log) => {
                      const emotion = getEmotion(log.emotion);
                      return (
                        <li key={log.id} className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <EmotionBadge emotionId={log.emotion} size="sm" />
                            <span className="text-[0.65rem] font-bold text-muted">
                              {formatDateTime(log.createdAt)} · intensidade {log.intensity}/5
                            </span>
                          </div>
                          {log.note ? (
                            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                              “{log.note}”
                            </p>
                          ) : (
                            <p className="mt-1 text-[0.68rem] text-muted">
                              {emotion.hint ? `Sem motivo informado · ${emotion.hint}` : "Sem motivo informado"}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="eyebrow">Autonomia</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink">Resumo da semana</h2>
                </div>
                <span className="chip">{weekPercent}%</span>
              </div>
              <div className="mt-4">
                <WeeklyBars days={weekDays} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                <div>
                  <p className="font-display text-lg font-black text-ink">{weekDone}</p>
                  <p className="text-[0.62rem] font-bold text-muted">concluídas</p>
                </div>
                <div>
                  <p className="font-display text-lg font-black text-ink">
                    {Math.max(weekTotal - weekDone, 0)}
                  </p>
                  <p className="text-[0.62rem] font-bold text-muted">pendentes</p>
                </div>
                <div>
                  <p className="font-display text-lg font-black text-ink">{weekPercent}%</p>
                  <p className="text-[0.62rem] font-bold text-muted">do planejado</p>
                </div>
              </div>
              <Link href="/responsavel/rotina" className="btn-secondary mt-4 w-full text-xs">
                <CalendarCheck2 className="size-4" aria-hidden />
                Acompanhar rotina completa
              </Link>
            </section>

            {activePending > 0 && (
              <section className="rounded-3xl bg-help-soft p-5">
                <LifeBuoy className="size-6 text-help" aria-hidden />
                <h2 className="mt-2 font-display text-lg font-extrabold text-help-strong">
                  {activePending === 1
                    ? "Um pedido de ajuda recente"
                    : `${activePending} pedidos de ajuda recentes`}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-help-strong/80">
                  {activeDependent.name} pediu assistência e ainda não recebeu confirmação.
                </p>
                <Link href="/responsavel/ajuda" className="btn bg-help text-white mt-3 min-h-9 w-full text-xs hover:bg-help-strong">
                  Ver e reconhecer
                </Link>
              </section>
            )}

            <section className="rounded-3xl bg-primary-soft/60 p-5">
              <HeartHandshake className="size-6 text-primary" aria-hidden />
              <h2 className="mt-2 font-display text-lg font-extrabold text-primary-strong">
                Cuidar sem cobrar
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-primary-strong/90">
                Use os registros para conversar, não para avaliar. Dias difíceis também fazem parte
                do processo de autonomia.
              </p>
              <Link
                href="/responsavel/ajuda"
                className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-primary-strong underline underline-offset-4"
              >
                Ver histórico de ajuda
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
