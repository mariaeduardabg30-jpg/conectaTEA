"use client";

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedContext = new AudioContextClass();
  }
  return sharedContext;
}

/** Desbloqueia o áudio após um gesto do usuário (política dos navegadores). */
export async function unlockAudio(): Promise<boolean> {
  const context = getContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return context.state === "running";
}

function note(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume = 0.16,
  type: OscillatorType = "sine",
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** Alerta sonoro acolhedor, porém perceptível, para pedidos de ajuda. */
export async function playHelpAlert(): Promise<void> {
  const context = getContext();
  if (!context) return;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }
  const now = context.currentTime + 0.05;
  const pattern = [659.25, 783.99, 987.77, 783.99];
  pattern.forEach((frequency, index) => {
    note(context, frequency, now + index * 0.22, 0.5, 0.14, "sine");
  });
  pattern.forEach((frequency, index) => {
    note(context, frequency / 2, now + 1.2 + index * 0.22, 0.5, 0.07, "triangle");
  });
}

/** Som curto de confirmação para ações do dependente. */
export async function playConfirmationTone(): Promise<void> {
  const context = getContext();
  if (!context) return;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }
  const now = context.currentTime + 0.02;
  note(context, 523.25, now, 0.22, 0.08, "sine");
  note(context, 783.99, now + 0.1, 0.3, 0.07, "sine");
}
