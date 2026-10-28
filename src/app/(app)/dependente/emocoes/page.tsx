"use client";

import { useCallback, useMemo, useState } from "react";
import {
  HeartHandshake,
  History,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EmotionBadge } from "@/components/emotion-badge";
import { ErrorNote, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { playConfirmationTone } from "@/lib/audio/alerts";
import { addDays, formatLongDate, formatTime, isToday, toDateKey } from "@/lib/date";
import { EMOTIONS, getEmotion, INTENSITY_LABELS } from "@/lib/emotions";
import { useAsync } from "@/lib/hooks/use-async";
import { useClientNow } from "@/lib/hooks/use-client-now";
import type { EmotionLog } from "@/lib/types";

export default function DependentEmotionsPage() {
  const { backend, activeDependent } = useApp();
  const now = useClientNow();
  const [selected, setSelected] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<EmotionLog | null>(null);

  const loader = useCallback(
    () =>
      activeDependent
        ? backend.listEmotions(activeDependent.id, addDays(new Date(), -30).toISOString())
        : Promise.resolve([]),
    [backend, activeDependent],
  );
  const { data: logs, loading, error: loadError, reload, setData } = useAsync<EmotionLog[]>(
    loader,
    [backend, activeDependent?.id],
    [],
  );

  const weekLogs = useMemo(() => {
    const limit = addDays(new Date(), -7).getTime();
    return logs.filter((log) => new Date(log.createdAt).getTime() >= limit);
  }, [logs]);

  const weekCounts = useMemo(() => {
    const counts = new Map<string, number>();
    weekLogs.forEach((log) => counts.set(log.emotion, (counts.get(log.emotion) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [weekLogs]);

  const grouped = useMemo(() => {
    const groups = new Map<string, EmotionLog[]>();
    logs.forEach((log) => {
      const key = toDateKey(new Date(log.createdAt));
      const list = groups.get(key) ?? [];
      list.push(log);
      groups.set(key, list);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeDependent || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const created = await backend.createEmotion(activeDependent.id, {
        emotion: selected,
        intensity,
        note,
      });
      setData([created, ...logs]);
      setSaved(created);
      setSelected(null);
      setIntensity(3);
      setNote("");
      void playConfirmationTone();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar sua emoção.",
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSaved(null);
    setSelected(null);
    setIntensity(3);
    setNote("");
    setError(null);
    reload();
  };

  if (!activeDependent) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Minhas emoções"
        title="Tudo bem sentir"
        description="Escolha como você está agora e, se quiser, conte o que aconteceu. Não existe emoção errada."
      />

      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card p-5 sm:p-6">
          {saved ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Save className="size-9" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-2xl font-black text-ink">Registro guardado</h2>
              <p className="mt-1 text-sm text-muted">
                {formatLongDate(new Date(saved.createdAt))} às {formatTime(saved.createdAt)}
              </p>
              <div className="mt-5 w-full max-w-md rounded-3xl bg-surface-2 p-5">
                <div className="flex items-center justify-center gap-3">
                  <span
                    className="flex size-14 items-center justify-center rounded-full text-3xl"
                    style={{ backgroundColor: getEmotion(saved.emotion).color }}
                    aria-hidden
                  >
                    {getEmotion(saved.emotion).emoji}
                  </span>
                  <div className="text-left">
                    <p className="font-display text-xl font-extrabold text-ink">
                      {getEmotion(saved.emotion).label}
                    </p>
                    <p className="text-xs font-bold text-muted">
                      Intensidade: {INTENSITY_LABELS[saved.intensity] ?? saved.intensity}
                    </p>
                  </div>
                </div>
                {saved.note && (
                  <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-left text-sm leading-relaxed text-ink-soft">
                    “{saved.note}”
                  </p>
                )}
              </div>
              <div className="mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row">
                <button type="button" onClick={reset} className="btn-primary flex-1">
                  <RotateCcw className="size-4" aria-hidden />
                  Registrar outra
                </button>
                <a href="#historico" className="btn-secondary flex-1">
                  <History className="size-4" aria-hidden />
                  Ver histórico
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={save}>
              <fieldset>
                <legend className="font-display text-xl font-black text-ink">
                  1. Como você está se sentindo?
                </legend>
                <p className="mt-1 text-sm text-muted">Toque na emoção mais parecida com agora.</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {EMOTIONS.map((emotion) => {
                    const active = selected === emotion.id;
                    return (
                      <button
                        key={emotion.id}
                        type="button"
                        onClick={() => setSelected(emotion.id)}
                        aria-pressed={active}
                        className={`flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2.5 text-center transition ${
                          active
                            ? "scale-[1.02] border-ink/30 shadow-card"
                            : "border-transparent hover:-translate-y-0.5 hover:shadow-card"
                        }`}
                        style={{ backgroundColor: emotion.color }}
                      >
                        <span className="text-3xl" aria-hidden>
                          {emotion.emoji}
                        </span>
                        <span
                          className="text-xs font-extrabold"
                          style={{ color: emotion.text }}
                        >
                          {emotion.label}
                        </span>
                        <span className="hidden text-[0.6rem] leading-tight opacity-70 sm:block" style={{ color: emotion.text }}>
                          {emotion.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {selected && (
                <div className="mt-6 space-y-5 border-t border-line pt-5">
                  <fieldset>
                    <legend className="font-display text-lg font-extrabold text-ink">
                      2. Quanto dessa emoção você sente?
                    </legend>
                    <div className="mt-3 flex items-center gap-2" role="group" aria-label="Intensidade da emoção">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const active = intensity === value;
                        const size = 38 + value * 5;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setIntensity(value)}
                            aria-pressed={active}
                            aria-label={`Intensidade ${value} de 5: ${INTENSITY_LABELS[value]}`}
                            className={`flex items-center justify-center rounded-full border-2 font-display text-sm font-black transition ${
                              active
                                ? "border-primary bg-primary text-white"
                                : "border-line-strong bg-surface text-ink-soft hover:border-primary/40"
                            }`}
                            style={{ width: size, height: size }}
                          >
                            {value}
                          </button>
                        );
                      })}
                      <span className="ml-1 text-xs font-bold text-muted">
                        {INTENSITY_LABELS[intensity]}
                      </span>
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="emotion-note" className="label">
                      3. Quer contar o que aconteceu? <span className="font-normal text-muted">(opcional)</span>
                    </label>
                    <textarea
                      id="emotion-note"
                      className="input min-h-28 resize-y"
                      placeholder="Ex.: Teve muito barulho na escola e eu fiquei sobrecarregada."
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={280}
                    />
                    <p className="mt-1 text-right text-[0.68rem] font-bold text-muted">
                      {note.length}/280
                    </p>
                  </div>

                  {error && <ErrorNote>{error}</ErrorNote>}

                  <button type="submit" disabled={saving} className="btn-primary min-h-12 w-full text-base">
                    <Save className="size-5" aria-hidden />
                    {saving ? "Salvando…" : "Salvar meu registro"}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Seu responsável poderá ver este registro para acompanhar você.
                  </p>
                </div>
              )}
            </form>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <h2 className="font-display text-lg font-extrabold text-ink">Sua semana emocional</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {weekLogs.length === 0
                ? "Ainda não há registros nesta semana."
                : `${weekLogs.length} ${weekLogs.length === 1 ? "registro" : "registros"} nos últimos 7 dias.`}
            </p>
            {weekCounts.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {weekCounts.slice(0, 4).map(([emotionId, count]) => {
                  const emotion = getEmotion(emotionId);
                  const max = weekCounts[0][1] || 1;
                  return (
                    <li key={emotionId}>
                      <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden>{emotion.emoji}</span>
                          {emotion.label}
                        </span>
                        <span>{count}×</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(count / max) * 100}%`, backgroundColor: emotion.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-primary-soft/60 p-5">
            <HeartHandshake className="size-6 text-primary" aria-hidden />
            <h2 className="mt-2 font-display text-lg font-extrabold text-primary-strong">
              Lembretes gentis
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-primary-strong/90">
              <li>• Você pode registrar a mesma emoção várias vezes no dia.</li>
              <li>• Não precisa explicar tudo. Uma palavra já ajuda.</li>
              <li>• Se estiver difícil, use o botão de ajuda.</li>
            </ul>
          </section>
        </div>
      </div>

      <section id="historico" className="card overflow-hidden scroll-mt-24">
        <div className="flex items-center justify-between gap-3 border-b border-line/80 px-5 py-4">
          <div>
            <p className="eyebrow">Histórico</p>
            <h2 className="mt-1 font-display text-xl font-black text-ink">Meus registros recentes</h2>
          </div>
          <span className="chip">{logs.length} registros</span>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-5">
            <LoadingBlock label="Carregando seus registros…" />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="text-4xl" aria-hidden>
              🌱
            </span>
            <p className="mt-3 font-display text-lg font-extrabold text-ink">
              Seu histórico começa hoje
            </p>
            <p className="mt-1 text-sm text-muted">
              Depois do primeiro registro, ele aparece aqui com data e horário.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/70">
            {grouped.map(([dateKey, entries]) => {
              const date = new Date(`${dateKey}T12:00:00`);
              const label = now && isToday(date) ? "Hoje" : formatLongDate(date);
              return (
                <div key={dateKey} className="px-4 py-4 sm:px-5">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
                    {label}
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {entries.map((entry) => {
                      const emotion = getEmotion(entry.emotion);
                      return (
                        <li
                          key={entry.id}
                          className="flex items-start gap-3 rounded-2xl bg-surface-2 px-3.5 py-3"
                        >
                          <span
                            className="flex size-11 shrink-0 items-center justify-center rounded-full text-2xl"
                            style={{ backgroundColor: emotion.color }}
                            aria-hidden
                          >
                            {emotion.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <EmotionBadge emotionId={entry.emotion} size="sm" />
                              <span className="text-[0.68rem] font-bold text-muted">
                                {formatTime(entry.createdAt)} · intensidade {entry.intensity}/5
                              </span>
                            </div>
                            {entry.note && (
                              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                                “{entry.note}”
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
