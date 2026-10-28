"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/data/provider";
import { readableTextColor, withAlpha } from "@/lib/theme";

export function DependentSwitcher({ manageHref }: { manageHref?: string }) {
  const { dependents, activeDependent, setActiveDependentId } = useApp();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!activeDependent) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3.5 text-left transition hover:border-primary/30"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Dependente selecionado: ${activeDependent.name}. Trocar dependente`}
      >
        <span
          className="flex size-8 items-center justify-center rounded-full text-lg"
          style={{
            backgroundColor: activeDependent.color,
            color: readableTextColor(activeDependent.color),
          }}
          aria-hidden
        >
          {activeDependent.avatar}
        </span>
        <span className="hidden text-sm font-bold text-ink sm:block">{activeDependent.name}</span>
        <ChevronDown className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Selecionar dependente"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-3xl border border-line bg-surface p-1.5 shadow-lift"
        >
          <p className="px-3 pb-1 pt-2 text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-muted">
            Acompanhando
          </p>
          {dependents.map((dependent) => {
            const selected = dependent.id === activeDependent.id;
            return (
              <button
                key={dependent.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setActiveDependentId(dependent.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  selected ? "bg-primary-soft/70 text-primary-strong" : "text-ink-soft hover:bg-surface-2"
                }`}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full text-lg"
                  style={{
                    backgroundColor: withAlpha(dependent.color, 0.9),
                    color: readableTextColor(dependent.color),
                  }}
                  aria-hidden
                >
                  {dependent.avatar}
                </span>
                <span className="flex-1 truncate">{dependent.name}</span>
                {selected && <Check className="size-4" aria-hidden />}
              </button>
            );
          })}
          {manageHref && (
            <div className="mt-1 border-t border-line pt-1">
              <Link
                href={manageHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-ink-soft hover:bg-surface-2"
              >
                <Settings2 className="size-4" aria-hidden />
                Gerenciar dependentes
              </Link>
            </div>
          )}
          {!manageHref && (
            <div className="mt-1 border-t border-line pt-1">
              <Link
                href="/responsavel/dependentes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-ink-soft hover:bg-surface-2"
              >
                <Plus className="size-4" aria-hidden />
                Adicionar dependente
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
