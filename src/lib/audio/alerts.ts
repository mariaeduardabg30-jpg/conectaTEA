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
  const pattern = [659.25, 783.99, 987.77, 1174.66];
  // Duas sequências ascendentes seguidas: o alerta se destaca de qualquer
  // som ambiente sem depender de arquivo de áudio externo.
  const rounds = [0, 1.5];
  for (const offset of rounds) {
    pattern.forEach((frequency, index) => {
      const start = now + offset + index * 0.18;
      note(context, frequency, start, 0.32, 0.3, "triangle");
      note(context, frequency / 2, start, 0.32, 0.14, "sine");
    });
  }
  // Pulso grave final, para quem está longe do aparelho perceber.
  note(context, 392, now + 3.1, 0.7, 0.24, "triangle");
  note(context, 196, now + 3.1, 0.7, 0.16, "sine");
}

/** Tom curto e suave para novas notificações (tarefas, lembretes). */
export async function playNotificationTone(): Promise<void> {
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
  note(context, 587.33, now, 0.2, 0.12, "sine");
  note(context, 880, now + 0.1, 0.32, 0.12, "sine");
  note(context, 1174.66, now + 0.22, 0.36, 0.1, "triangle");
}

/** Lembrete de tarefa: tom mais forte, para chamar a atenção sem alarmar. */
export async function playReminderTone(): Promise<void> {
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
  note(context, 440, now, 0.3, 0.2, "sine");
  note(context, 660, now + 0.12, 0.3, 0.2, "sine");
  note(context, 880, now + 0.24, 0.4, 0.2, "triangle");
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
