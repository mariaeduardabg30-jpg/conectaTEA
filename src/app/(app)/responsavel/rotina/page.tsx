"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { EmptyState, ErrorNote, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { WeeklyBars } from "@/components/weekly-bars";
import { useApp } from "@/lib/data/provider";
import {
  addDays,
  formatLongDate,
  formatWeekRange,
  isToday,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import { useAsync } from "@/lib/hooks/use-async";
import { useClientNow } from "@/lib/hooks/use-client-now";
import type { RoutineItem, TaskCompletion } from "@/lib/types";

type WeekData = {
  items: RoutineItem[];
  completions: TaskCompletion[];
};

const EMPTY: WeekData = { items: [], completions: [] };

export default function ResponsibleRoutinePage() {
  const { backend, activeDependent } = useApp();
  const now = useClientNow();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => (now ? addDays(startOfWeek(now), weekOffset * 7) : null),
    [now, weekOffset],
  );
  const weekKey = weekStart ? toDateKey(weekStart) : "";

  const loader = useCallback(async (): Promise<WeekData> => {
    if (!activeDependent || !weekStart) return EMPTY;
    const from = toDateKey(weekStart);
    const to = toDateKey(addDays(weekStart, 6));
    const [items, completions] = await Promise.all([
      backend.listRoutineItems(activeDependent.id),
      backend.listCompletions(activeDependent.id, from, to),
    ]);
    return { items, completions };
  }, [backend, activeDependent, weekStart]);

  const { data, loading, error } = useAsync<WeekData>(
    loader,
    [backend, activeDependent?.id, weekKey],
    EMPTY,
  );

  const days = useMemo(
    () =>
      weekStart
        ? Array.from({ length: 7 }, (_, index) => {
            const date = addDays(weekStart, index);
            const key = toDateKey(date);
            const scheduled = data.items
              .filter((item) => item.days.includes(date.getDay()))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const doneIds = new Set(
              data.completions
                .filter((completion) => completion.date === key)
                .map((completion) => completion.routineItemId),
            );
            const done = scheduled.filter((item) => doneIds.has(item.id)).length;
            return { date, key, scheduled, doneIds, done };
          })
        : [],
    [data, weekStart],
  );

  const weekTotal = days.reduce((total, day) => total + day.scheduled.length, 0);
  const weekDone = days.reduce((total, day) => total + day.done, 0);
  const weekPercent = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const fullDays = days.filter((day) => day.scheduled.length > 0 && day.done === day.scheduled.length).length;
  const isCurrentWeek = weekOffset === 0;

  if (!activeDependent) return <LoadingBlock />;
  if (!now || !weekStart) return <LoadingBlock label="Carregando rotina…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acompanhamento da rotina"
        title={`Rotina de ${activeDependent.name}`}
        description="Veja o que estava planejado, o que foi concluído e o que ficou pendente. O objetivo é acompanhar a autonomia, não medir desempenho."
        actions={
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-card">
            <button
              type="button"
              onClick={() => setWeekOffset((value) => value - 1)}
              className="flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-2"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="min-w-32 px-1 text-center text-xs font-extrabold text-ink">
              {formatWeekRange(weekStart)}
            </span>
            <button
              type="button"
              onClick={() => setWeekOffset((value) => Math.min(0, value + 1))}
              disabled={isCurrentWeek}
              className="flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-2 disabled:opacity-30"
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">
          <CalendarCheck2 className="size-3.5" aria-hidden />
          {isCurrentWeek ? "Semana atual" : "Semana anterior"}
        </span>
        <span className="chip">
          {weekDone} de {weekTotal} concluídas
        </span>
        <span className="chip">
          <Sparkles className="size-3.5" aria-hidden />
          {fullDays} {fullDays === 1 ? "dia completo" : "dias completos"}
        </span>
        {!isCurrentWeek && (
          <button type="button" onClick={() => setWeekOffset(0)} className="chip hover:text-primary">
            <RotateCcw className="size-3.5" aria-hidden />
            Voltar para a semana atual
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted">
            Cumprimento da semana
          </p>
          <p className="mt-1 font-display text-3xl font-black text-ink">{weekPercent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${weekPercent}%` }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted">
            Atividades concluídas
          </p>
          <p className="mt-1 font-display text-3xl font-black text-primary">{weekDone}</p>
          <p className="mt-1 text-[0.68rem] font-bold text-muted">de {weekTotal} planejadas</p>
        </div>
        <div className="card p-4">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted">
            Ainda pendentes
          </p>
          <p className="mt-1 font-display text-3xl font-black text-accent">
            {Math.max(weekTotal - weekDone, 0)}
          </p>
          <p className="mt-1 text-[0.68rem] font-bold text-muted">sem cobrança, com contexto</p>
        </div>
        <div className="card p-4">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted">
            Dias completos
          </p>
          <p className="mt-1 font-display text-3xl font-black text-ink">{fullDays}</p>
          <p className="mt-1 text-[0.68rem] font-bold text-muted">de 7 dias da semana</p>
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Visão da semana</p>
            <h2 className="mt-1 font-display text-xl font-black text-ink">Como foi o ritmo</h2>
          </div>
          <span className="chip">{weekPercent}% do planejado</span>
        </div>
        <div className="mt-5">
          <WeeklyBars days={days.map((day) => ({ date: day.date, done: day.done, total: day.scheduled.length }))} />
        </div>
      </section>

      {loading && days.length === 0 ? (
        <LoadingBlock label="Carregando rotina da semana…" />
      ) : data.items.length === 0 ? (
        <div className="card p-5">
          <EmptyState
            emoji="🧩"
            title="Nenhuma rotina cadastrada"
            description={`${activeDependent.name} ainda não criou atividades. A rotina é montada na área do dependente, no ritmo dela.`}
            tone="primary"
            action={
              <Link href="/dependente/rotina" className="btn-primary">
                Abrir área do dependente
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {days.map((day) => {
            const today = isToday(day.date);
            return (
              <section
                key={day.key}
                className={`card overflow-hidden ${today ? "border-primary/40 ring-2 ring-primary/10" : ""}`}
                aria-labelledby={`rotina-${day.key}`}
              >
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 border-b border-line/80 px-4 py-3 ${
                    today ? "bg-primary-soft/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold text-ink-soft">
                      {day.date.getDate()}
                    </span>
                    <div>
                      <h2
                        id={`rotina-${day.key}`}
                        className="font-display text-sm font-extrabold capitalize text-ink"
                      >
                        {formatLongDate(day.date)}
                      </h2>
                      {today && (
                        <p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-primary">
                          Hoje
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold ${
                      day.scheduled.length === 0
                        ? "bg-surface-2 text-muted"
                        : day.done === day.scheduled.length
                          ? "bg-primary-soft text-primary-strong"
                          : "bg-accent-soft text-accent"
                    }`}
                  >
                    {day.scheduled.length === 0
                      ? "Dia livre"
                      : `${day.done}/${day.scheduled.length}`}
                  </span>
                </div>

                {day.scheduled.length === 0 ? (
                  <p className="px-4 py-5 text-xs font-bold text-muted">
                    Nenhuma atividade programada.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {day.scheduled.map((item) => {
                      const done = day.doneIds.has(item.id);
                      return (
                        <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                              done
                                ? "bg-primary text-white"
                                : "border border-line-strong bg-surface text-muted"
                            }`}
                            aria-hidden
                          >
                            {done ? (
                              <Check className="size-4" strokeWidth={3} />
                            ) : (
                              <span className="text-sm">{item.emoji}</span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-bold ${
                                done ? "text-muted line-through" : "text-ink"
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="flex items-center gap-1 text-[0.65rem] font-bold text-muted">
                              <Clock className="size-3" aria-hidden />
                              {item.startTime} · {item.durationMin} min
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[0.62rem] font-extrabold ${
                              done ? "text-primary" : "text-muted"
                            }`}
                          >
                            {done ? "Concluída" : "Pendente"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-3 rounded-3xl bg-primary-soft/50 px-5 py-4 sm:flex-row sm:items-center">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-primary-strong">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          A rotina é criada e ajustada na área do dependente. Aqui, você acompanha o processo — os
          dias incompletos também contam histórias.
        </p>
        <Link href="/responsavel/emocoes" className="btn-secondary shrink-0 text-primary-strong">
          Ver emoções da semana
        </Link>
      </div>
    </div>
  );
}
