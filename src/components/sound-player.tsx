"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume1, Volume2 } from "lucide-react";
import { CalmSoundEngine } from "@/lib/audio/engine";
import { ErrorNote } from "@/components/ui/page-header";
import { SOUNDS, TIMER_OPTIONS, type SoundOption } from "@/lib/sounds";

type Status = "idle" | "playing" | "paused";

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function SoundPlayer() {
  const engineRef = useRef<CalmSoundEngine | null>(null);
  const [selected, setSelected] = useState<SoundOption>(SOUNDS[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [volume, setVolume] = useState(0.55);
  const [timer, setTimer] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    engineRef.current = new CalmSoundEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (status !== "playing" || timer === 0) return;
    const timeout = window.setTimeout(() => {
      if (remaining <= 1) {
        engineRef.current?.stop();
        setRemaining(0);
        setStatus("idle");
        return;
      }
      setRemaining(remaining - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [status, timer, remaining]);

  const start = async (option: SoundOption) => {
    setError(null);
    try {
      await engineRef.current?.play(option.id, volume);
      setSelected(option);
      setStatus("playing");
      setRemaining(timer * 60);
    } catch (cause) {
      setStatus("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível tocar o som. Tente novamente.",
      );
    }
  };

  const toggle = async () => {
    if (status === "playing") {
      await engineRef.current?.pause();
      setStatus("paused");
      return;
    }
    if (status === "paused") {
      try {
        await engineRef.current?.resume();
        setStatus("playing");
      } catch {
        setError("Não foi possível retomar o som. Tente tocar novamente.");
      }
      return;
    }
    await start(selected);
  };

  const stop = () => {
    engineRef.current?.stop();
    setStatus("idle");
    setRemaining(timer * 60);
  };

  const chooseSound = async (option: SoundOption) => {
    if (selected.id === option.id && status === "playing") {
      await engineRef.current?.pause();
      setStatus("paused");
      return;
    }
    if (selected.id === option.id && status === "paused") {
      try {
        await engineRef.current?.resume();
        setStatus("playing");
      } catch {
        await start(option);
      }
      return;
    }
    await start(option);
  };

  const selectTimer = (value: number) => {
    setTimer(value);
    setRemaining(value * 60);
  };

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-[32px] border border-line shadow-card"
        style={{ background: selected.gradient }}
      >
        <div className="relative p-6 sm:p-8">
          <div aria-hidden className="absolute -right-16 -top-20 size-64 rounded-full bg-white/35 blur-2xl" />
          <div aria-hidden className="absolute -bottom-24 -left-12 size-56 rounded-full bg-white/25 blur-2xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                className={`flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/55 text-5xl shadow-card ${
                  status === "playing" ? "animate-float" : ""
                }`}
                aria-hidden
              >
                {selected.emoji}
              </span>
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em]" style={{ color: selected.accent }}>
                  {status === "playing" ? "Tocando agora" : status === "paused" ? "Pausado" : "Escolha um som"}
                </p>
                <h2 className="mt-1 font-display text-3xl font-black tracking-tight text-ink">
                  {selected.name}
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-soft">
                  {selected.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 items-end gap-1.5" aria-hidden>
                {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                  <span
                    key={bar}
                    className={`w-1.5 rounded-full ${status === "playing" ? "sound-bar" : ""}`}
                    style={{
                      height: `${18 + ((bar * 7) % 30)}px`,
                      backgroundColor: selected.accent,
                      opacity: status === "playing" ? 0.7 : 0.25,
                      animationDelay: `${bar * 0.11}s`,
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={toggle}
                className="flex size-16 items-center justify-center rounded-full bg-white text-ink shadow-lift transition hover:scale-105 active:scale-95"
                aria-label={status === "playing" ? "Pausar som" : "Tocar som"}
              >
                {status === "playing" ? (
                  <Pause className="size-7" fill="currentColor" aria-hidden />
                ) : (
                  <Play className="ml-1 size-7" fill="currentColor" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={stop}
                disabled={status === "idle"}
                className="flex size-12 items-center justify-center rounded-full bg-white/45 text-ink transition hover:bg-white/70 disabled:opacity-40"
                aria-label="Parar som"
              >
                <Square className="size-5" fill="currentColor" aria-hidden />
              </button>
            </div>
          </div>

          <div className="relative mt-6 flex flex-col gap-4 rounded-2xl bg-white/45 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <Volume1 className="size-5 shrink-0 text-ink-soft" aria-hidden />
              <label htmlFor="sound-volume" className="sr-only">
                Volume do som
              </label>
              <input
                id="sound-volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="h-2 w-full max-w-52 cursor-pointer appearance-none rounded-full bg-white/80 accent-[#2d6b5e]"
                aria-valuetext={`${Math.round(volume * 100)}%`}
              />
              <Volume2 className="size-5 shrink-0 text-ink-soft" aria-hidden />
              <span className="w-10 text-right text-xs font-extrabold text-ink-soft">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tempo do som">
              {TIMER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectTimer(option.value)}
                  aria-pressed={timer === option.value}
                  className={`min-h-9 rounded-full px-3 text-xs font-extrabold transition ${
                    timer === option.value
                      ? "bg-ink text-white"
                      : "bg-white/60 text-ink-soft hover:bg-white/85"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-ink-soft" aria-live="polite">
              {timer > 0
                ? status === "idle"
                  ? `Timer de ${timer} min pronto`
                  : `Termina em ${formatRemaining(remaining)}`
                : "O som continua até você parar"}
            </p>
            {status !== "idle" && (
              <p className="text-xs font-bold text-ink-soft">
                {status === "playing" ? "Respire fundo. Você está em um lugar seguro." : "Pausado a seu pedido."}
              </p>
            )}
          </div>
        </div>
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Escolha o seu</p>
            <h2 className="mt-1 font-display text-2xl font-black text-ink">Sons disponíveis</h2>
          </div>
          <p className="hidden text-xs font-bold text-muted sm:block">Toque para ouvir</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SOUNDS.map((sound) => {
            const active = sound.id === selected.id;
            const playing = active && status === "playing";
            return (
              <li key={sound.id}>
                <button
                  type="button"
                  onClick={() => chooseSound(sound)}
                  aria-pressed={playing}
                  className={`group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card ${
                    active
                      ? "border-primary/40 bg-surface ring-2 ring-primary/15"
                      : "border-line bg-surface"
                  }`}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-20 opacity-80"
                    style={{ background: sound.gradient }}
                  />
                  <div className="relative flex w-full items-start justify-between">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-card" aria-hidden>
                      {sound.emoji}
                    </span>
                    <span
                      className={`flex size-10 items-center justify-center rounded-full transition ${
                        playing ? "bg-primary text-white" : "bg-white/80 text-ink-soft group-hover:bg-white"
                      }`}
                      aria-hidden
                    >
                      {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
                    </span>
                  </div>
                  <div className="relative mt-4 flex w-full flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-extrabold text-ink">{sound.name}</h3>
                      {playing && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-primary-strong">
                          tocando
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{sound.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold" style={{ color: sound.accent }}>
                      {playing ? "Pausar" : active && status === "paused" ? "Continuar" : "Ouvir agora"}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { emoji: "🎧", title: "Use fones se puder", text: "Ajuda a abafar sons do ambiente e deixa a experiência mais confortável." },
          { emoji: "🌬️", title: "Respire junto", text: "Inspire enquanto a onda sobe, solte o ar quando ela desce." },
          { emoji: "⏱️", title: "Escolha um tempo", text: "Um timer ajuda a saber quando vai acabar, sem surpresas." },
        ].map((tip) => (
          <div key={tip.title} className="card p-4">
            <span className="text-2xl" aria-hidden>
              {tip.emoji}
            </span>
            <h3 className="mt-2 font-display text-base font-extrabold text-ink">{tip.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{tip.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
