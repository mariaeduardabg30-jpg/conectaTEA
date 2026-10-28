"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ChevronRight,
  Music2,
  PencilLine,
  Smile,
  Sparkles,
} from "lucide-react";
import { EmotionBadge } from "@/components/emotion-badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState, ErrorNote, LoadingBlock } from "@/components/ui/page-header";
import { WeeklyBars } from "@/components/weekly-bars";
import { playConfirmationTone } from "@/lib/audio/alerts";
import { useApp } from "@/lib/data/provider";
import {
  addDays,
  formatLongDate,
  getWeekDays,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import { useAsync } from "@/lib/hooks/use-async";
import { useClientNow } from "@/lib/hooks/use-client-now";
import type { EmotionLog, RoutineItem, TaskCompletion } from "@/lib/types";

type TodayData = {
  items: RoutineItem[];
  completions: TaskCompletion[];
  emotions: EmotionLog[];
};

const EMPTY: TodayData = { items: [], completions: [], emotions: [] };

export default function DependentTodayPage() {
  const { backend, activeDependent } = useApp();
  const now = useClientNow();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loader = useCallback(async (): Promise<TodayData> => {
    if (!activeDependent) return EMPTY;
    const current = new Date();
    const weekStart = startOfWeek(current);
    const from = toDateKey(weekStart);
    const to = toDateKey(addDays(weekStart, 6));
    const fromEmotions = addDays(current, -7).toISOString();
    const [items, completions, emotions] = await Promise.all([
      backend.listRoutineItems(activeDependent.id),
      backend.listCompletions(activeDependent.id, from, to),
      backend.listEmotions(activeDependent.id, fromEmotions),
    ]);
    return { items, completions, emotions };
  }, [backend, activeDependent]);

  const { data, loading, error, setData } = useAsync<TodayData>(
    loader,
    [backend, activeDependent?.id],
    EMPTY,
  );

  const todayKey = now ? toDateKey(now) : "";
  const todayItems = useMemo(() => {
    if (!now) return [];
    return data.items
      .filter((item) => item.days.includes(now.getDay()))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [data.items, now]);

  const doneIds = useMemo(
    () =>
      new Set(
        data.completions
          .filter((completion) => completion.date === todayKey)
          .map((completion) => completion.routineItemId),
      ),
    [data.completions, todayKey],
  );

  const doneCount = todayItems.filter((item) => doneIds.has(item.id)).length;
  const weekDays = useMemo(() => {
    if (!now) return [];
    return getWeekDays(now).map((date) => {
      const key = toDateKey(date);
      const scheduled = data.items.filter((item) => item.days.includes(date.getDay()));
      const done = scheduled.filter((item) =>
        data.completions.some(
          (completion) => completion.date === key && completion.routineItemId === item.id,
        ),
      ).length;
      return { date, done, total: scheduled.length };
    });
  }, [data.items, data.completions, now]);

  const todayEmotion = useMemo(
    () => data.emotions.find((emotion) => toDateKey(new Date(emotion.createdAt)) === todayKey),
    [data.emotions, todayKey],
  );

  const toggle = async (item: RoutineItem) => {
    if (!activeDependent || !now || savingId) return;
    const alreadyDone = doneIds.has(item.id);
    const previous = data;
    const nextCompletions = alreadyDone
      ? data.completions.filter(
          (completion) =>
            !(completion.date === todayKey && completion.routineItemId === item.id),
        )
      : [
          ...data.completions,
          {
            id: `local-${item.id}`,
            dependentId: activeDependent.id,
            routineItemId: item.id,
            date: todayKey,
            completedAt: new Date().toISOString(),
          },
        ];

    setSaveError(null);
    setSavingId(item.id);
    setData({ ...data, completions: nextCompletions });
    if (!alreadyDone) void playConfirmationTone();

    try {
      await backend.setCompletion(activeDependent.id, item.id, todayKey, !alreadyDone);
    } catch (cause) {
      setData(previous);
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (!activeDependent) return <LoadingBlock />;

  if (loading && data === EMPTY) {
    return (
      <div className="space-y-6">
        <LoadingBlock label="Carregando seu dia…" />
      </div>
    );
  }

  const greeting =
    !now ? "Olá" : now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const allDone = todayItems.length > 0 && doneCount === todayItems.length;
  const encouragement = allDone
    ? "Você concluiu tudo o que planejou para hoje. Que orgulho! 🎉"
    : doneCount > 0
      ? `Você já fez ${doneCount} de ${todayItems.length} atividades. Siga no seu ritmo.`
      : "Um passo de cada vez. Sua rotina está aqui para ajudar, não para cobrar.";

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="eyebrow">{now ? formatLongDate(now) : "Seu dia"}</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
              {greeting}, {activeDependent.name}{" "}
              <span aria-hidden>{activeDependent.avatar}</span>
            </h1>
            <p className="mt-2 max-w-md text-[0.98rem] leading-relaxed text-ink-soft">
              {encouragement}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">
                <CalendarCheck2 className="size-3.5" aria-hidden />
                {todayItems.length} atividades hoje
              </span>
              <span className="chip">
                <Check className="size-3.5 text-primary" aria-hidden />
                {doneCount} concluídas
              </span>
            </div>
          </div>
          <ProgressRing
            done={doneCount}
            total={todayItems.length}
            color={activeDependent.color}
            label={`${doneCount} de ${todayItems.length} atividades concluídas hoje`}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow">Passo a passo</p>
              <h2 className="mt-1 font-display text-2xl font-black text-ink">Minha rotina de hoje</h2>
            </div>
            <Link href="/dependente/rotina" className="btn-secondary min-h-9 px-3.5 py-1.5 text-xs">
              <PencilLine className="size-3.5" aria-hidden />
              Editar rotina
            </Link>
          </div>

          {saveError && <div className="mt-4"><ErrorNote>{saveError}</ErrorNote></div>}
          {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

          {todayItems.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                emoji="🌤️"
                title="Hoje está livre"
                description="Nenhuma atividade foi programada para hoje. Você pode criar uma rotina ou simplesmente aproveitar o dia."
                action={
                  <Link href="/dependente/rotina" className="btn-primary">
                    Criar minha rotina
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {todayItems.map((item, index) => {
                const done = doneIds.has(item.id);
                const saving = savingId === item.id;
                const next = todayItems[index + 1];
                return (
                  <li key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      aria-pressed={done}
                      aria-label={`${item.title}, ${item.startTime}${done ? ", concluída" : ", pendente"}. Toque para ${done ? "desmarcar" : "marcar como concluída"}`}
                      disabled={saving}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition sm:gap-4 sm:px-4 ${
                        done
                          ? "border-primary/25 bg-primary-soft/50"
                          : "border-line bg-surface hover:border-primary/30 hover:bg-surface-2"
                      } ${saving ? "opacity-70" : ""}`}
                    >
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          done
                            ? "border-primary bg-primary text-white"
                            : "border-line-strong bg-surface text-muted"
                        }`}
                        aria-hidden
                      >
                        {done ? <Check className="size-6" strokeWidth={3} /> : <span className="text-xl">{item.emoji}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate font-display text-base font-extrabold ${
                            done ? "text-muted line-through" : "text-ink"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold text-muted">
                          <span>{item.startTime}</span>
                          <span aria-hidden>·</span>
                          <span>{item.durationMin} min</span>
                          {done && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="text-primary">Concluída</span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted" aria-hidden>
                        {saving ? (
                          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <span className={`text-xl ${done ? "opacity-50" : ""}`}>{item.emoji}</span>
                        )}
                      </span>
                    </button>
                    {next && (
                      <span
                        aria-hidden
                        className="absolute -bottom-2 left-[34px] z-10 h-2.5 w-px bg-line-strong sm:left-[38px]"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-xl" aria-hidden>
              💛
            </span>
            <p className="text-xs leading-relaxed text-ink-soft">
              Não precisa dar conta de tudo de uma vez. Se algo parecer difícil demais, use o botão
              <strong className="text-help"> Preciso de ajuda</strong> no canto da tela.
            </p>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Como você está?</p>
                <h2 className="mt-1 font-display text-xl font-black text-ink">Minha emoção</h2>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Smile className="size-5" aria-hidden />
              </span>
            </div>

            {todayEmotion ? (
              <div className="mt-4">
                <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
                  <EmotionBadge emotionId={todayEmotion.emotion} size="lg" showLabel={false} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-ink">
                      Você registrou
                      <EmotionBadge emotionId={todayEmotion.emotion} size="sm" />
                    </p>
                    {todayEmotion.note && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                        “{todayEmotion.note}”
                      </p>
                    )}
                  </div>
                </div>
                <Link href="/dependente/emocoes" className="btn-secondary mt-3 w-full">
                  Registrar outra emoção
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Reservar um minutinho para perceber como você se sente ajuda bastante.
                </p>
                <Link href="/dependente/emocoes" className="btn-primary mt-4 w-full">
                  <Smile className="size-4" aria-hidden />
                  Registrar como estou
                </Link>
              </>
            )}
          </section>

          <Link
            href="/dependente/sons"
            className="group block overflow-hidden rounded-[28px] border border-line bg-surface shadow-card transition hover:-translate-y-0.5"
          >
            <div className="relative p-5">
              <div
                aria-hidden
                className="absolute -right-8 -top-8 size-32 rounded-full bg-primary-soft/80 blur-xl transition group-hover:bg-primary/20"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Para acalmar</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink">Sons relaxantes</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    Chuva, mar, floresta e mais. Escolha o que combina com o seu momento.
                  </p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Music2 className="size-5" aria-hidden />
                </span>
              </div>
              <div className="relative mt-4 flex items-center justify-between">
                <div className="flex items-end gap-1" aria-hidden>
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className="sound-bar h-6 w-1.5 rounded-full bg-primary/50"
                      style={{ animationDelay: `${bar * 0.14}s` }}
                    />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary">
                  Abrir sons
                  <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </div>
          </Link>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Sua semana</p>
                <h2 className="mt-1 font-display text-xl font-black text-ink">Como está o ritmo</h2>
              </div>
              <Sparkles className="size-5 text-accent" aria-hidden />
            </div>
            {weekDays.length > 0 ? (
              <div className="mt-4">
                <WeeklyBars days={weekDays} compact />
                <p className="mt-3 text-center text-[0.7rem] leading-relaxed text-muted">
                  Cada barra é um dia. Não existe nota — só o seu caminho.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Carregando sua semana…</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
