"use client";

import type { SoundId } from "@/lib/sounds";

type NoiseKind = "white" | "pink" | "brown";

type Bundle = {
  sources: AudioScheduledSourceNode[];
  timers: number[];
};

function createNoiseBuffer(context: AudioContext, kind: NoiseKind): AudioBuffer {
  const length = context.sampleRate * 4;
  const buffer = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") {
        data[i] = white * 0.7;
      } else if (kind === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      } else {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
  }

  return buffer;
}

function makeNoiseSource(context: AudioContext, kind: NoiseKind): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, kind);
  source.loop = true;
  return source;
}

export class CalmSoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private bundle: Bundle | null = null;
  private volume = 0.6;

  currentSound: SoundId | null = null;

  private ensureContext(): AudioContext {
    if (!this.context) {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Seu navegador não oferece suporte a sons neste dispositivo.");
      }
      this.context = new AudioContextClass();
    }
    return this.context;
  }

  private targetVolume(): number {
    return Math.max(0, Math.min(1, this.volume)) * 0.65;
  }

  private build(context: AudioContext, destination: GainNode, id: SoundId): Bundle {
    const sources: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];

    const connectNoise = (kind: NoiseKind, filterType: BiquadFilterType, frequency: number, q: number) => {
      const source = makeNoiseSource(context, kind);
      const filter = context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      source.connect(filter);
      filter.connect(destination);
      source.start();
      sources.push(source);
      return { source, filter };
    };

    if (id === "branco") {
      connectNoise("white", "lowpass", 9000, 0.5);
    } else if (id === "marrom") {
      connectNoise("brown", "lowpass", 900, 0.7);
    } else if (id === "chuva") {
      const { filter } = connectNoise("white", "highpass", 1200, 0.4);
      const softener = context.createBiquadFilter();
      softener.type = "lowpass";
      softener.frequency.value = 7200;
      filter.disconnect();
      filter.connect(softener);
      softener.connect(destination);

      const rumble = makeNoiseSource(context, "brown");
      const rumbleFilter = context.createBiquadFilter();
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.value = 320;
      const rumbleGain = context.createGain();
      rumbleGain.gain.value = 0.35;
      rumble.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(destination);
      rumble.start();
      sources.push(rumble);

      for (let i = 0; i < 8; i += 1) {
        const drop = context.createOscillator();
        const dropGain = context.createGain();
        drop.type = "sine";
        drop.frequency.value = 1400 + Math.random() * 1600;
        dropGain.gain.value = 0.0001;
        drop.connect(dropGain);
        dropGain.connect(destination);
        const startAt = context.currentTime + Math.random() * 6;
        dropGain.gain.setValueAtTime(0.0001, startAt);
        dropGain.gain.exponentialRampToValueAtTime(0.012, startAt + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.09);
        drop.start(startAt);
        drop.stop(startAt + 0.12);
        sources.push(drop);
      }
    } else if (id === "oceano") {
      const { filter } = connectNoise("brown", "lowpass", 620, 0.9);
      const wave = context.createOscillator();
      const waveGain = context.createGain();
      wave.type = "sine";
      wave.frequency.value = 0.075;
      waveGain.gain.value = 0.16;
      wave.connect(waveGain);
      waveGain.connect(filter.frequency);
      wave.start();
      sources.push(wave);

      const swell = context.createOscillator();
      const swellGain = context.createGain();
      swell.type = "sine";
      swell.frequency.value = 0.045;
      swellGain.gain.value = 0.08;
      const amplitude = context.createGain();
      amplitude.gain.value = 0.32;
      swell.connect(swellGain);
      swellGain.connect(amplitude.gain);
      swell.start();
      sources.push(swell);

      const foam = makeNoiseSource(context, "white");
      const foamFilter = context.createBiquadFilter();
      foamFilter.type = "bandpass";
      foamFilter.frequency.value = 1600;
      foamFilter.Q.value = 0.6;
      const foamGain = context.createGain();
      foamGain.gain.value = 0.035;
      foam.connect(foamFilter);
      foamFilter.connect(foamGain);
      foamGain.connect(amplitude);
      amplitude.connect(destination);
      foam.start();
      sources.push(foam);
    } else if (id === "vento") {
      const { filter } = connectNoise("brown", "bandpass", 480, 0.8);
      const breeze = context.createOscillator();
      const breezeGain = context.createGain();
      breeze.type = "sine";
      breeze.frequency.value = 0.06;
      breezeGain.gain.value = 160;
      breeze.connect(breezeGain);
      breezeGain.connect(filter.frequency);
      breeze.start();
      sources.push(breeze);

      const gusts = context.createOscillator();
      const gustsGain = context.createGain();
      gusts.type = "sine";
      gusts.frequency.value = 0.02;
      gustsGain.gain.value = 0.12;
      const amplitude = context.createGain();
      amplitude.gain.value = 0.35;
      gusts.connect(gustsGain);
      gustsGain.connect(amplitude.gain);
      gusts.start();
      sources.push(gusts);
      filter.disconnect();
      filter.connect(amplitude);
      amplitude.connect(destination);
    } else {
      // floresta
      connectNoise("pink", "lowpass", 1400, 0.5);
      const leaves = makeNoiseSource(context, "white");
      const leavesFilter = context.createBiquadFilter();
      leavesFilter.type = "bandpass";
      leavesFilter.frequency.value = 3200;
      leavesFilter.Q.value = 0.4;
      const leavesGain = context.createGain();
      leavesGain.gain.value = 0.018;
      leaves.connect(leavesFilter);
      leavesFilter.connect(leavesGain);
      leavesGain.connect(destination);
      leaves.start();
      sources.push(leaves);

      const chirp = () => {
        if (!this.context || this.context.state === "closed") return;
        const now = this.context.currentTime;
        const notes = 1 + Math.floor(Math.random() * 3);
        for (let note = 0; note < notes; note += 1) {
          const start = now + note * 0.16;
          const oscillator = this.context.createOscillator();
          const gain = this.context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(1700 + Math.random() * 500, start);
          oscillator.frequency.exponentialRampToValueAtTime(2500 + Math.random() * 600, start + 0.12);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.02, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
          oscillator.connect(gain);
          gain.connect(destination);
          oscillator.start(start);
          oscillator.stop(start + 0.17);
        }
      };

      const timer = window.setInterval(chirp, 9000 + Math.random() * 5000);
      timers.push(timer);
    }

    return { sources, timers };
  }

  private teardown(): void {
    if (!this.context) return;
    if (this.bundle) {
      this.bundle.timers.forEach((timer) => window.clearInterval(timer));
      this.bundle.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // a fonte já pode ter sido encerrada
        }
      });
      this.bundle = null;
    }
    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
    this.currentSound = null;
  }

  async play(id: SoundId, volume = this.volume): Promise<void> {
    const context = this.ensureContext();
    this.volume = volume;
    this.teardown();
    if (context.state === "suspended") await context.resume();

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(this.targetVolume(), context.currentTime + 1.2);
    master.connect(context.destination);
    this.master = master;
    this.bundle = this.build(context, master, id);
    this.currentSound = id;
  }

  async pause(): Promise<void> {
    if (this.context?.state === "running") await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") await this.context.resume();
  }

  stop(): void {
    if (!this.context || !this.master) {
      this.teardown();
      return;
    }
    const now = this.context.currentTime;
    const master = this.master;
    const bundle = this.bundle;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    window.setTimeout(() => {
      if (bundle === this.bundle) this.teardown();
    }, 850);
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.targetVolume(), this.context.currentTime, 0.08);
    }
  }

  dispose(): void {
    this.teardown();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
