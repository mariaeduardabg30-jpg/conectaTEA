"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Info,
  RotateCcw,
} from "lucide-react";
import { EmotionBadge } from "@/components/emotion-badge";
import { EmotionSummary } from "@/components/emotion-summary";
import { EmptyState, ErrorNote, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import {
  addDays,
  formatLongDate,
  formatTime,
  formatWeekRange,
  isToday,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import { getEmotion } from "@/lib/emotions";
import { useAsync } from "@/lib/hooks/use-async";
import { useClientNow } from "@/lib/hooks/use-client-now";
import type { EmotionLog } from "@/lib/types";

export default function ResponsibleEmotionsPage() {
  const { backend, activeDependent } = useApp();
  const now = useClientNow();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => (now ? addDays(startOfWeek(now), weekOffset * 7) : null),
    [now, weekOffset],
  );
  const weekKey = weekStart ? toDateKey(weekStart) : "";

  const loader = useCallback(async (): Promise<EmotionLog[]> => {
    if (!activeDependent || !weekStart) return [];
    const from = new Date(weekStart);
    from.setHours(0, 0, 0, 0);
    const to = addDays(from, 7);
    const logs = await backend.listEmotions(activeDependent.id, from.toISOString());
    return logs.filter((log) => {
      const time = new Date(log.createdAt).getTime();
      return time >= from.getTime() && time < to.getTime();
    });
  }, [backend, activeDependent, weekStart]);

  const { data: logs, loading, error } = useAsync<EmotionLog[]>(
    loader,
    [backend, activeDependent?.id, weekKey],
    [],
  );

  const days = useMemo(
    () => (weekStart ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)) : []),
    [weekStart],
  );

  const logsByDay = useMemo(() => {
    const map = new Map<string, EmotionLog[]>();
    logs.forEach((log) => {
      const key = toDateKey(new Date(log.createdAt));
      const list = map.get(key) ?? [];
      list.push(log);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    return map;
  }, [logs]);

  const daysWithRecords = days.filter((day) => (logsByDay.get(toDateKey(day)) ?? []).length > 0).length;
  const notesCount = logs.filter((log) => log.note.trim().length > 0).length;
  const isCurrentWeek = weekOffset === 0;

  if (!activeDependent) return <LoadingBlock />;
  if (!now || !weekStart) return <LoadingBlock label="Carregando emoções…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acompanhamento emocional"
        title={`Emoções de ${activeDependent.name}`}
        description="Veja os registros por dia, os motivos informados e as mudanças ao longo da semana. Use isso como ponto de partida para uma conversa acolhedora."
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
          <CalendarDays className="size-3.5" aria-hidden />
          {isCurrentWeek ? "Semana atual" : "Semana anterior"}
        </span>
        <span className="chip">{logs.length} registros</span>
        <span className="chip">{notesCount} com motivo</span>
        {!isCurrentWeek && (
          <button type="button" onClick={() => setWeekOffset(0)} className="chip hover:text-primary">
            <RotateCcw className="size-3.5" aria-hidden />
            Voltar para a semana atual
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          {loading && logs.length === 0 ? (
            <LoadingBlock label="Carregando registros da semana…" />
          ) : logs.length === 0 ? (
            <div className="card p-5">
              <EmptyState
                emoji="🌙"
                title="Nenhum registro nesta semana"
                description={`${activeDependent.name} ainda não registrou emoções nesse período. Você pode conversar com calma ou aguardar — o registro é uma escolha dela.`}
                action={
                  <Link href="/responsavel/rotina" className="btn-secondary">
                    Ver rotina da semana
                  </Link>
                }
              />
            </div>
          ) : (
            days.map((day) => {
              const key = toDateKey(day);
              const dayLogs = logsByDay.get(key) ?? [];
              const today = isToday(day);
              return (
                <section
                  key={key}
                  className={`card overflow-hidden ${
                    today ? "border-primary/40 ring-2 ring-primary/10" : ""
                  }`}
                  aria-labelledby={`dia-${key}`}
                >
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border-b border-line/80 px-4 py-3 ${
                      today ? "bg-primary-soft/40" : "bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold text-ink-soft">
                        {day.getDate()}
                      </span>
                      <div>
                        <h2
                          id={`dia-${key}`}
                          className="font-display text-sm font-extrabold capitalize text-ink"
                        >
                          {formatLongDate(day)}
                        </h2>
                        {today && (
                          <p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-primary">
                            Hoje
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="chip">
                      {dayLogs.length} {dayLogs.length === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  {dayLogs.length === 0 ? (
                    <p className="px-4 py-4 text-xs font-bold text-muted">Sem registros neste dia.</p>
                  ) : (
                    <ul className="divide-y divide-line/70">
                      {dayLogs.map((log) => {
                        const emotion = getEmotion(log.emotion);
                        return (
                          <li key={log.id} className="flex items-start gap-3 px-4 py-3.5">
                            <span
                              className="flex size-11 shrink-0 items-center justify-center rounded-full text-2xl"
                              style={{ backgroundColor: emotion.color }}
                              aria-hidden
                            >
                              {emotion.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <EmotionBadge emotionId={log.emotion} size="sm" />
                                <span className="text-[0.65rem] font-bold text-muted">
                                  {formatTime(log.createdAt)}
                                </span>
                                <span
                                  className="flex items-center gap-0.5"
                                  aria-label={`Intensidade ${log.intensity} de 5`}
                                >
                                  {[1, 2, 3, 4, 5].map((dot) => (
                                    <span
                                      key={dot}
                                      className={`size-1.5 rounded-full ${
                                        dot <= log.intensity ? "bg-ink-soft" : "bg-line-strong"
                                      }`}
                                      aria-hidden
                                    />
                                  ))}
                                </span>
                              </div>
                              {log.note ? (
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                                  “{log.note}”
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-muted">
                                  Nenhum motivo informado.
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <HeartPulse className="size-4" aria-hidden />
              </span>
              <h2 className="font-display text-lg font-extrabold text-ink">Resumo da semana</h2>
            </div>
            <div className="mt-4">
              <EmotionSummary
                logs={logs}
                emptyLabel="Sem registros suficientes para montar o resumo."
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-center">
              <div>
                <p className="font-display text-xl font-black text-ink">{daysWithRecords}/7</p>
                <p className="text-[0.62rem] font-bold text-muted">dias com registro</p>
              </div>
              <div>
                <p className="font-display text-xl font-black text-ink">{logs.length}</p>
                <p className="text-[0.62rem] font-bold text-muted">registros no total</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-primary-soft/60 p-5">
            <Info className="size-5 text-primary" aria-hidden />
            <h2 className="mt-2 font-display text-lg font-extrabold text-primary-strong">
              O que observar
            </h2>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-primary-strong/90">
              <li>• Repetições de emoções intensas em dias específicos.</li>
              <li>• Motivos ligados a barulho, mudanças de rotina ou cansaço.</li>
              <li>• Dias sem registro também são informação: podem indicar uma semana mais leve.</li>
            </ul>
            <p className="mt-3 border-t border-primary/15 pt-3 text-[0.68rem] leading-relaxed text-primary-strong/80">
              Evite interpretar um único registro como regra. Olhe o conjunto e converse com
              curiosidade, não com julgamento.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-extrabold text-ink">Ver também</h2>
            <div className="mt-3 space-y-2">
              <Link href="/responsavel/rotina" className="btn-secondary w-full justify-between text-xs">
                Rotina da semana
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
              <Link href="/responsavel/ajuda" className="btn-secondary w-full justify-between text-xs">
                Pedidos de ajuda
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
              <Link href="/responsavel" className="btn-ghost w-full justify-start text-xs">
                <ArrowLeft className="size-3.5" aria-hidden />
                Voltar para a visão geral
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
