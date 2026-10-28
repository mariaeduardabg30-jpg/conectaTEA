"use client";

import { useSyncExternalStore } from "react";
import { unlockAudio } from "@/lib/audio/alerts";

const KEY = "conectatea.alert-sound";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "off";
}

export function setAlertSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, enabled ? "on" : "off");
  if (enabled) void unlockAudio();
  emit();
}

export function useAlertSound(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
