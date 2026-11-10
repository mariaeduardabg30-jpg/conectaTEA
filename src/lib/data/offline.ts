/**
 * Apoio offline do ConectaTEA.
 *
 * Os dados ficam no Supabase, mas o app também guarda uma cópia local do que
 * foi carregado por último. Assim, quando o dispositivo fica sem internet, as
 * telas continuam mostrando a rotina, as emoções e os pedidos de ajuda.
 *
 * As ações feitas sem conexão (concluir atividade, registrar emoção, pedir
 * ajuda) entram em uma fila e são enviadas automaticamente quando a internet
 * volta. Nada é perdido ao fechar o app.
 */

const STORAGE_PREFIX = "conectatea.offline.v1.";
const OUTBOX_KEY = `${STORAGE_PREFIX}outbox`;
const OUTBOX_EVENT = "conectatea:outbox";

export const OFFLINE_READ_MESSAGE =
  "Você está offline e ainda não há dados salvos neste dispositivo. Conecte-se à internet uma vez para liberar o uso offline.";

type CacheEnvelope<T> = { savedAt: number; value: T };

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isBrowserOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

const NETWORK_ERROR_PATTERN =
  /failed to fetch|fetch failed|network ?error|network request failed|load failed|err_internet_disconnected|err_network|err_name_not_resolved|err_connection|econn|etimedout|timed? ?out|authretryablefetch|service unavailable|bad gateway|gateway timeout|sem conex[aã]o/i;

/**
 * Reconhece falhas de rede (e não erros de regra/permissão do banco), para
 * decidir quando usar o cache local em vez de mostrar erro na tela.
 */
export function isOfflineError(cause: unknown): boolean {
  if (!cause) return false;
  const record = cause as { message?: unknown; code?: unknown; name?: unknown };
  const parts = [
    record.message,
    record.code,
    record.name,
    cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "",
  ];
  const text = parts.filter((part) => typeof part === "string").join(" ");
  return NETWORK_ERROR_PATTERN.test(text);
}

/** Chave de cache isolada por usuário e por tipo de dado. */
export function cacheKey(...parts: string[]): string {
  return `${STORAGE_PREFIX}${parts.map((part) => part || "-").join(".")}`;
}

export function cacheRead<T>(key: string): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T> | T;
    if (parsed && typeof parsed === "object" && "value" in parsed) {
      return (parsed as CacheEnvelope<T>).value;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function cacheWrite<T>(key: string, value: T): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Armazenamento cheio ou bloqueado: o app segue funcionando online.
  }
}

export function cacheRemove(key: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // Ignora falhas de armazenamento.
  }
}

/* ------------------------------------------------------------------ */
/* Fila de ações pendentes (outbox)                                    */
/* ------------------------------------------------------------------ */

export type OfflineOperation =
  | {
      kind: "completion";
      dependentId: string;
      routineItemId: string;
      date: string;
      done: boolean;
    }
  | {
      kind: "emotion";
      dependentId: string;
      emotion: string;
      intensity: number;
      note: string;
      /** Id temporário do registro no cache local, para não duplicar na tela. */
      localId?: string;
    }
  | {
      kind: "help_request";
      dependentId: string;
      message: string | null;
      /** Id temporário do pedido no cache local, para não duplicar na tela. */
      localId?: string;
    }
  | { kind: "help_ack"; id: string; byName: string; at: string }
  | { kind: "notification_read"; id: string }
  | { kind: "notifications_read_all" };

export type QueuedOperation = {
  id: string;
  userId: string;
  createdAt: number;
  op: OfflineOperation;
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Identificador temporário para registros criados sem conexão. */
export function localId(prefix: string): string {
  return `local-${prefix}-${uid()}`;
}

export function notifyOutboxChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

function readOutbox(): QueuedOperation[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedOperation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: QueuedOperation[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    // Sem espaço: a próxima sincronização ainda acontece com o que couber.
  }
  notifyOutboxChange();
}

export function outboxAdd(userId: string, op: OfflineOperation): QueuedOperation {
  const item: QueuedOperation = { id: uid(), userId, createdAt: Date.now(), op };
  writeOutbox([...readOutbox(), item]);
  return item;
}

export function outboxList(): QueuedOperation[] {
  return readOutbox();
}

export function outboxRemove(id: string): void {
  writeOutbox(readOutbox().filter((item) => item.id !== id));
}

export function outboxCount(): number {
  return readOutbox().length;
}
