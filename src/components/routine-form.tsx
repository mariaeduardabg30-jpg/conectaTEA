"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ErrorNote, InlineSpinner } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/date";
import { ROUTINE_EMOJIS } from "@/lib/theme";
import type { RoutineItem } from "@/lib/types";

const DURATIONS = [5, 10, 15, 20, 30, 40, 50, 60, 90];

export function RoutineFormModal({
  open,
  onClose,
  dependentId,
  item,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  dependentId: string;
  item: RoutineItem | null;
  onSaved: () => void;
}) {
  const { backend } = useApp();
  const [title, setTitle] = useState(item?.title ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "✅");
  const [startTime, setStartTime] = useState(item?.startTime ?? "08:00");
  const [days, setDays] = useState<number[]>(item ? [...item.days] : [0, 1, 2, 3, 4, 5, 6]);
  const [durationMin, setDurationMin] = useState(item?.durationMin ?? 15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (title.trim().length < 2) {
      setError("Dê um nome para a atividade.");
      return;
    }
    if (days.length === 0) {
      setError("Escolha pelo menos um dia da semana.");
      return;
    }
    if (!startTime) {
      setError("Escolha um horário.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        emoji,
        startTime,
        days,
        durationMin,
      };
      if (item) await backend.updateRoutineItem(item.id, input);
      else await backend.createRoutineItem(dependentId, input);
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar a atividade.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Editar atividade" : "Nova atividade"}
      description="Escolha um nome, um horário e em quais dias ela acontece."
      size="md"
    >
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label htmlFor="routine-title" className="label">
            O que você vai fazer?
          </label>
          <input
            id="routine-title"
            className="input"
            placeholder="Ex.: Escovar os dentes"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            autoFocus
            required
          />
        </div>

        <fieldset>
          <legend className="label">Escolha um símbolo</legend>
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {ROUTINE_EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEmoji(option)}
                aria-pressed={emoji === option}
                aria-label={`Símbolo ${option}`}
                className={`flex aspect-square items-center justify-center rounded-xl border text-xl transition ${
                  emoji === option
                    ? "border-primary bg-primary-soft"
                    : "border-line bg-surface hover:border-primary/30 hover:bg-surface-2"
                }`}
              >
                <span aria-hidden>{option}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="routine-time" className="label">
              Horário
            </label>
            <input
              id="routine-time"
              type="time"
              className="input"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="routine-duration" className="label">
              Duração aproximada
            </label>
            <select
              id="routine-duration"
              className="input"
              value={durationMin}
              onChange={(event) => setDurationMin(Number(event.target.value))}
            >
              {DURATIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} minutos
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="label">Em quais dias?</legend>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {WEEK_ORDER.map((day) => {
              const selected = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={selected}
                  className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border text-xs font-extrabold transition ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-surface text-ink-soft hover:border-primary/30"
                  }`}
                >
                  {selected && <Check className="size-3" strokeWidth={3} aria-hidden />}
                  {WEEKDAY_SHORT[day]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Toque nos dias em que essa atividade acontece.</p>
        </fieldset>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <InlineSpinner className="size-4" />}
            {item ? "Salvar alterações" : "Adicionar atividade"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
