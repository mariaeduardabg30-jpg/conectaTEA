"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ErrorNote, InlineSpinner } from "@/components/ui/page-header";
import { useApp } from "@/lib/data/provider";
import { DEPENDENT_AVATARS, DEPENDENT_COLORS, readableTextColor } from "@/lib/theme";
import type { Dependent } from "@/lib/types";

export function DependentFormModal({
  open,
  onClose,
  dependent,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  dependent: Dependent | null;
  onSaved: () => void;
}) {
  const { backend } = useApp();
  const [name, setName] = useState(dependent?.name ?? "");
  const [avatar, setAvatar] = useState<string>(dependent?.avatar ?? DEPENDENT_AVATARS[0]);
  const [color, setColor] = useState<string>(dependent?.color ?? DEPENDENT_COLORS[0].value);
  const [email, setEmail] = useState(dependent?.email ?? "");
  const [age, setAge] = useState(dependent?.age != null ? String(dependent.age) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Informe o nome do dependente.");
      return;
    }

    const cleanEmail = email.trim();
    if (cleanEmail && !cleanEmail.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }

    let parsedAge: number | null = null;
    if (age.trim()) {
      const value = Number(age);
      if (!Number.isInteger(value) || value < 0 || value > 130) {
        setError("Informe uma idade válida.");
        return;
      }
      parsedAge = value;
    }

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        avatar,
        color,
        email: cleanEmail || null,
        age: parsedAge,
      };
      if (dependent) await backend.updateDependent(dependent.id, input);
      else await backend.createDependent(input);
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dependent ? "Editar perfil" : "Novo dependente"}
      description="Cada pessoa tem seu próprio espaço, com rotina, emoções e sons."
      size="md"
    >
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label htmlFor="dependent-name" className="label">
            Nome ou apelido
          </label>
          <input
            id="dependent-name"
            className="input"
            placeholder="Ex.: Lia"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            autoFocus
            required
          />
        </div>

        <div>
          <span className="label">Avatar</span>
          <div className="grid grid-cols-6 gap-1.5">
            {DEPENDENT_AVATARS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAvatar(option)}
                aria-pressed={avatar === option}
                aria-label={`Avatar ${option}`}
                className={`flex aspect-square items-center justify-center rounded-2xl border text-2xl transition ${
                  avatar === option
                    ? "border-primary bg-primary-soft"
                    : "border-line bg-surface hover:border-primary/30 hover:bg-surface-2"
                }`}
              >
                <span aria-hidden>{option}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Cor do perfil</span>
          <div className="flex flex-wrap gap-2">
            {DEPENDENT_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                aria-pressed={color === option.value}
                aria-label={`Cor ${option.label}`}
                className={`flex size-10 items-center justify-center rounded-full border-2 transition ${
                  color === option.value ? "border-ink" : "border-transparent"
                }`}
                style={{ backgroundColor: option.value }}
              >
                {color === option.value && (
                  <Check
                    className="size-4"
                    style={{ color: readableTextColor(option.value) }}
                    strokeWidth={3}
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="dependent-email" className="label">
            E-mail do dependente <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="dependent-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="input"
            placeholder="lia@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Se o dependente criar a conta dele com este e-mail, os dois acessos são vinculados.
          </p>
        </div>

        <div>
          <label htmlFor="dependent-age" className="label">
            Idade <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="dependent-age"
            type="number"
            inputMode="numeric"
            min={0}
            max={130}
            className="input"
            placeholder="Ex.: 12"
            value={age}
            onChange={(event) => setAge(event.target.value)}
          />
        </div>

        <div
          className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5"
          aria-hidden
        >
          <span
            className="flex size-12 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: color, color: readableTextColor(color) }}
          >
            {avatar}
          </span>
          <div>
            <p className="font-display text-base font-extrabold text-ink">
              {name.trim() || "Nome do dependente"}
            </p>
            <p className="text-xs font-bold text-muted">Prévia do perfil</p>
          </div>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <InlineSpinner className="size-4" />}
            {dependent ? "Salvar alterações" : "Criar perfil"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
