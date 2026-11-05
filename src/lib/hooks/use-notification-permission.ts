"use client";

import { useSyncExternalStore } from "react";
import {
  getNotificationPermission,
  NOTIFICATION_PERMISSION_EVENT,
  type NotificationPermissionState,
} from "@/lib/push";

export type NotificationPermissionView = NotificationPermissionState | "loading";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NOTIFICATION_PERMISSION_EVENT, onStoreChange);
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);
  return () => {
    window.removeEventListener(NOTIFICATION_PERMISSION_EVENT, onStoreChange);
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

function getSnapshot(): NotificationPermissionView {
  if (typeof window === "undefined") return "loading";
  return getNotificationPermission();
}

function getServerSnapshot(): NotificationPermissionView {
  return "loading";
}

/** Permissão de notificações do navegador, sincronizada entre os componentes. */
export function useNotificationPermission(): NotificationPermissionView {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
