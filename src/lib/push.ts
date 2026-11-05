"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type PushState =
  | "unsupported"
  | "demo"
  | "missing-key"
  | "inactive"
  | "subscribed";

export type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

/** Evento disparado quando a permissão de notificações muda neste dispositivo. */
export const NOTIFICATION_PERMISSION_EVENT = "conectatea:notification-permission";

/** Chave pública VAPID publicada pelo build (NEXT_PUBLIC_VAPID_PUBLIC_KEY). */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Notificações do navegador existem neste dispositivo (mesmo sem push). */
export function notificationsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

/** Permissão atual para mostrar notificações neste dispositivo. */
export function getNotificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "default";
}

function emitPermissionChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATION_PERMISSION_EVENT));
}

/**
 * Pede a permissão de notificações ao usuário. Deve ser chamada a partir de um
 * clique/toque, pois alguns navegadores exigem um gesto do usuário.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const current = getNotificationPermission();
  if (current !== "default") return current;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") return "granted";
    if (permission === "denied") return "denied";
    return "default";
  } catch (cause) {
    console.error("Falha ao pedir permissão de notificações", cause);
    return getNotificationPermission();
  } finally {
    emitPermissionChange();
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** Situação atual das notificações push neste dispositivo. */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!isSupabaseConfigured) return "demo";
  if (!VAPID_PUBLIC_KEY) return "missing-key";
  const registration = await getRegistration();
  if (!registration) return "inactive";
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? "subscribed" : "inactive";
  } catch {
    return "inactive";
  }
}

/** Pede permissão, inscreve o dispositivo e salva a inscrição no banco. */
export async function enablePushNotifications(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";

  // A permissão do aparelho é pedida mesmo quando o push ainda não está
  // configurado; assim os avisos locais já funcionam enquanto o restante é
  // ativado pelo responsável.
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return "inactive";

  if (!isSupabaseConfigured) return "demo";
  if (!VAPID_PUBLIC_KEY) return "missing-key";

  const client = getSupabase();
  if (!client) return "demo";

  const registration = await getRegistration();
  if (!registration) return "inactive";

  let subscription: PushSubscription | null = null;
  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
  } catch (cause) {
    console.error("Falha ao inscrever notificações push", cause);
    return "inactive";
  }

  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  const userId = (await client.auth.getUser()).data.user?.id;
  if (!userId) return "inactive";

  const { error } = await client.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh ?? "",
      auth: keys.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("Falha ao salvar a inscrição push", error);
    return "inactive";
  }
  return "subscribed";
}

/** Cancela a inscrição do dispositivo no push, se houver. */
export async function disablePushNotifications(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const registration = await getRegistration();
  try {
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const client = getSupabase();
      if (client) {
        await client.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      }
      await subscription.unsubscribe();
    }
  } catch (cause) {
    console.error("Falha ao cancelar a inscrição push", cause);
  }
  return "inactive";
}
