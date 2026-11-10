import { getSupabase } from "@/lib/supabase/client";
import type { AuthEvent, Backend, SignUpInput, SignUpResult } from "@/lib/data/backend";
import {
  OFFLINE_READ_MESSAGE,
  cacheKey,
  cacheRead,
  cacheWrite,
  isBrowserOffline,
  isOfflineError,
  localId,
  outboxAdd,
  outboxList,
  outboxRemove,
  type OfflineOperation,
} from "@/lib/data/offline";
import type {
  AppRole,
  AppUser,
  AppNotification,
  DataChange,
  DataTable,
  Dependent,
  DependentInput,
  EmotionLog,
  HelpRequest,
  HelpSubscription,
  NotificationType,
  RoutineItem,
  TaskCompletion,
} from "@/lib/types";

type Row = Record<string, unknown>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const number = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : Number(value ?? fallback);

const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const nullableAge = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

/**
 * Lê a sessão salva pelo Supabase no próprio navegador, sem validar a
 * expiração do token. É a reserva quando o app abre sem internet e o SDK
 * não consegue renovar a sessão — sem isso a pessoa seria desconectada.
 */
function storedSessionUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  let exactKey = "";
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    const ref = host.split(".")[0];
    if (ref) exactKey = `sb-${ref}-auth-token`;
  } catch {
    // Sem URL válida: procura qualquer sessão do Supabase.
  }
  try {
    const store = window.localStorage;
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key || !key.endsWith("-auth-token")) continue;
      if (exactKey ? key !== exactKey : !key.startsWith("sb-")) continue;
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { user?: AuthUser } | null;
      if (parsed?.user?.id) return parsed.user;
    }
  } catch {
    // Valor inválido ou armazenamento bloqueado.
  }
  return null;
}

type ProfileRow = {
  role?: unknown;
  name?: unknown;
  age?: unknown;
} | null;

/**
 * O perfil salvo no banco é a fonte da verdade para o papel da conta.
 * O metadata fica como reserva para projetos antigos, em que a linha de
 * `profiles` ainda não existia.
 */
function mapUser(user: AuthUser, profile?: ProfileRow): AppUser {
  const metadataName = user.user_metadata?.name;
  const metadataRole = user.user_metadata?.role;
  const role: AppRole =
    profile?.role === "dependente" || profile?.role === "responsavel"
      ? profile.role
      : metadataRole === "dependente"
        ? "dependente"
        : "responsavel";

  const profileName = typeof profile?.name === "string" ? profile.name.trim() : "";
  const metadataNameText =
    typeof metadataName === "string" ? metadataName.trim() : "";

  return {
    id: user.id,
    name:
      profileName ||
      metadataNameText ||
      user.email?.split("@")[0] ||
      (role === "dependente" ? "Dependente" : "Responsável"),
    email: user.email ?? "",
    role,
    age: nullableAge(profile?.age ?? user.user_metadata?.age),
  };
}

function mapDependent(row: Row): Dependent {
  return {
    id: text(row.id),
    name: text(row.name, "Dependente"),
    avatar: text(row.avatar, "🌱"),
    color: text(row.color, "#9FD3C2"),
    email: nullableText(row.email),
    age: nullableAge(row.age),
    userId: nullableText(row.user_id),
    linkCode: nullableText(row.link_code),
    createdAt: text(row.created_at, new Date().toISOString()),
  };
}

function mapRoutineItem(row: Row): RoutineItem {
  const days = Array.isArray(row.days)
    ? (row.days as unknown[]).map((day) => number(day)).filter((day) => day >= 0 && day <= 6)
    : [0, 1, 2, 3, 4, 5, 6];
  return {
    id: text(row.id),
    dependentId: text(row.dependent_id),
    title: text(row.title, "Atividade"),
    emoji: text(row.emoji, "✅"),
    startTime: text(row.start_time, "08:00").slice(0, 5),
    days: days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6],
    durationMin: number(row.duration_min, 15),
    active: row.active !== false,
    position: number(row.position, 0),
  };
}

function mapCompletion(row: Row): TaskCompletion {
  return {
    id: text(row.id),
    dependentId: text(row.dependent_id),
    routineItemId: text(row.routine_item_id),
    date: text(row.completion_date).slice(0, 10),
    completedAt: text(row.completed_at, new Date().toISOString()),
  };
}

function mapEmotion(row: Row): EmotionLog {
  return {
    id: text(row.id),
    dependentId: text(row.dependent_id),
    emotion: text(row.emotion, "calmo"),
    intensity: number(row.intensity, 3),
    note: text(row.note),
    createdAt: text(row.created_at, new Date().toISOString()),
  };
}

function mapNotification(row: Row): AppNotification {
  const rawType = text(row.type, "task_created");
  const type: NotificationType = (
    ["help_request", "help_acknowledged", "task_created", "task_reminder", "task_completed"] as const
  ).includes(rawType as NotificationType)
    ? (rawType as NotificationType)
    : "task_created";
  return {
    id: text(row.id),
    recipientId: nullableText(row.recipient_id),
    dependentId: text(row.dependent_id),
    type,
    title: text(row.title, "Notificação"),
    body: text(row.body),
    routineItemId: nullableText(row.routine_item_id),
    scheduledDate: nullableText(row.scheduled_date),
    readAt: nullableText(row.read_at),
    createdAt: text(row.created_at, new Date().toISOString()),
  };
}

/**
 * Erros de regra de negócio levantados pelas RPCs de vinculação vêm com o
 * prefixo LINK: para o cliente reconhecer e exibir a mensagem pronta.
 */
function linkError(error: { message?: string; code?: string } | null): never {
  const message = error?.message ?? "";
  const match = message.match(/LINK:([^\n]+)/);
  throw new Error(match?.[1]?.trim() || "Não foi possível vincular. Tente novamente.");
}

function mapHelpRequest(row: Row): HelpRequest {
  return {
    id: text(row.id),
    dependentId: text(row.dependent_id),
    message: nullableText(row.message),
    createdAt: text(row.created_at, new Date().toISOString()),
    acknowledgedAt: nullableText(row.acknowledged_at),
    acknowledgedBy: nullableText(row.acknowledged_by),
  };
}

function mapDataChange(
  table: DataTable,
  type: DataChange["type"],
  row: Row,
): DataChange {
  return {
    table,
    type,
    dependentId:
      table === "dependents" ? nullableText(row.id) : nullableText(row.dependent_id),
  };
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? "Não foi possível concluir a operação.");
}

/** Troca a falha de rede por uma orientação clara em português. */
async function runWhenOnline<T>(
  action: () => Promise<T>,
  message = "Você está offline. Conecte-se à internet para salvar esta alteração.",
): Promise<T> {
  try {
    return await action();
  } catch (cause) {
    if (isOfflineError(cause)) throw new Error(message);
    throw cause;
  }
}

export function createSupabaseBackend(): Backend {
  const getClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("Supabase não configurado.");
    return client;
  };

  /** Lê a sessão salva no dispositivo (não depende de internet). */
  async function sessionUser(): Promise<AuthUser | null> {
    const client = getClient();
    try {
      const { data } = await client.auth.getSession();
      const user = (data.session?.user as AuthUser | undefined) ?? null;
      if (user) return user;
    } catch {
      // Segue para a cópia salva no armazenamento local.
    }
    // Com o token expirado e sem internet, o SDK devolve sessão nula mesmo
    // tendo a sessão salva. O registro local ainda identifica a conta.
    return storedSessionUser();
  }

  async function currentUserId(): Promise<string> {
    const saved = await sessionUser();
    if (saved) return saved.id;
    const client = getClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    return user.id;
  }

  /**
   * Guarda no perfil o fuso do dispositivo. O banco usa esse valor para
   * disparar o lembrete no horário local correto, inclusive com o app fechado.
   * Falhas são silenciosas: o lembrete cai no fuso padrão até a atualização.
   */
  let lastTimezoneSync = "";
  async function syncTimeZone(userId: string): Promise<void> {
    if (typeof window === "undefined") return;
    let timezone = "";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return;
    }
    if (!timezone || lastTimezoneSync === `${userId}:${timezone}`) return;
    lastTimezoneSync = `${userId}:${timezone}`;
    try {
      const client = getClient();
      const { error } = await client
        .from("profiles")
        .update({ timezone })
        .eq("id", userId);
      if (error) lastTimezoneSync = "";
    } catch {
      lastTimezoneSync = "";
    }
  }

  /**
   * Aciona a Edge Function send-push com o payload do evento. No plano Free
   * do Supabase não há Database Webhooks; os pedidos de ajuda são enviados
   * pelo app de quem pediu (que está aberto no momento da ação), e o banco
   * cobre os lembretes agendados via pg_net (ver supabase/schema.sql).
   *
   * A chamada usa o JWT da sessão e nunca deve interromper a ação principal:
   * sem push configurado o app continua funcionando normalmente.
   */
  async function dispatchPush(payload: { table: string; record: Row }): Promise<void> {
    try {
      const client = getClient();
      const { error } = await client.functions.invoke("send-push", { body: payload });
      if (error) console.error("Falha ao acionar a Edge Function send-push", error);
    } catch (cause) {
      console.error("Falha ao acionar a Edge Function send-push", cause);
    }
  }

  async function loadUser(user: AuthUser): Promise<AppUser> {
    const profileKey = cacheKey("profile", user.id);
    const cachedProfile = cacheRead<AppUser>(profileKey);
    // Sem internet não há como consultar o perfil: usa o que já está salvo.
    if (isBrowserOffline()) return cachedProfile ?? mapUser(user);

    const client = getClient();
    try {
      const { data, error } = await client
        .from("profiles")
        .select("role, name, age")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const mapped = mapUser(user, data as ProfileRow);
      cacheWrite(profileKey, mapped);
      await syncTimeZone(user.id);
      return mapped;
    } catch {
      // Sem internet (ou sem acesso à tabela de perfis), usa o último perfil
      // salvo no dispositivo. O metadata do login é a reserva final.
      return cachedProfile ?? mapUser(user);
    }
  }

  function userCacheKey(userId: string, scope: string, ...parts: string[]): string {
    return cacheKey(scope, userId, ...parts);
  }

  /**
   * Lê do Supabase e guarda uma cópia local. Sem conexão, devolve a cópia.
   * `merge` permite juntar janelas diferentes de tempo (semana atual, últimos
   * dias) em uma única lista por dependente.
   */
  async function readWithCache<T>(
    scope: string,
    parts: string[],
    fetcher: () => Promise<T>,
    merge?: (fresh: T, cached: T | null) => T,
  ): Promise<T> {
    const userId = (await sessionUser())?.id ?? "anon";
    const key = userCacheKey(userId, scope, ...parts);
    const cached = cacheRead<T>(key);

    if (isBrowserOffline()) {
      if (cached !== null) return cached;
      throw new Error(OFFLINE_READ_MESSAGE);
    }

    try {
      const fresh = await fetcher();
      cacheWrite(key, merge ? merge(fresh, cached) : fresh);
      return fresh;
    } catch (cause) {
      if (isOfflineError(cause)) {
        if (cached !== null) return cached;
        throw new Error(OFFLINE_READ_MESSAGE);
      }
      throw cause;
    }
  }

  async function queueOperation(op: OfflineOperation): Promise<string> {
    const user = await sessionUser();
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    outboxAdd(user.id, op);
    return user.id;
  }

  async function cacheCompletion(
    userId: string,
    dependentId: string,
    routineItemId: string,
    date: string,
    done: boolean,
  ): Promise<void> {
    const key = userCacheKey(userId, "completions", dependentId);
    const current = cacheRead<TaskCompletion[]>(key);
    if (current === null) return;
    const without = current.filter(
      (item) => !(item.routineItemId === routineItemId && item.date === date),
    );
    cacheWrite(
      key,
      done
        ? [
            ...without,
            {
              id: localId("completion"),
              dependentId,
              routineItemId,
              date,
              completedAt: new Date().toISOString(),
            },
          ]
        : without,
    );
  }

  async function cacheEmotion(
    userId: string,
    log: EmotionLog,
    replaceId?: string,
  ): Promise<void> {
    const key = userCacheKey(userId, "emotions", log.dependentId);
    const current = cacheRead<EmotionLog[]>(key);
    if (current === null) return;
    cacheWrite(
      key,
      [
        log,
        ...current.filter(
          (item) => item.id !== log.id && (!replaceId || item.id !== replaceId),
        ),
      ].slice(0, 500),
    );
  }

  async function cacheHelp(
    userId: string,
    request: HelpRequest,
    replaceId?: string,
  ): Promise<void> {
    // A lista "todos" alimenta a tela do responsável; a lista por dependente
    // alimenta a tela de quem pediu. Atualiza as duas quando existirem.
    for (const scope of ["all", request.dependentId]) {
      if (!scope) continue;
      const key = userCacheKey(userId, "help", scope);
      const current = cacheRead<HelpRequest[]>(key);
      if (current === null) continue;
      const next = [
        request,
        ...current.filter(
          (item) => item.id !== request.id && (!replaceId || item.id !== replaceId),
        ),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      cacheWrite(key, next);
    }
  }

  async function cacheNotifications(
    userId: string,
    update: (current: AppNotification[]) => AppNotification[],
  ): Promise<void> {
    const key = userCacheKey(userId, "notifications");
    const current = cacheRead<AppNotification[]>(key);
    if (current === null) return;
    cacheWrite(key, update(current));
  }

  /** Reenvia uma ação salva sem passar de novo pela fila. */
  async function replayOperation(op: OfflineOperation, userId: string): Promise<void> {
    const client = getClient();
    switch (op.kind) {
      case "completion": {
        if (op.done) {
          const { error } = await client.from("task_completions").upsert(
            {
              dependent_id: op.dependentId,
              routine_item_id: op.routineItemId,
              completion_date: op.date,
            },
            { onConflict: "routine_item_id,completion_date" },
          );
          if (error) fail(error);
        } else {
          const { error } = await client
            .from("task_completions")
            .delete()
            .eq("routine_item_id", op.routineItemId)
            .eq("completion_date", op.date);
          if (error) fail(error);
        }
        await cacheCompletion(userId, op.dependentId, op.routineItemId, op.date, op.done);
        return;
      }
      case "emotion": {
        const { data, error } = await client
          .from("emotion_logs")
          .insert({
            dependent_id: op.dependentId,
            emotion: op.emotion,
            intensity: op.intensity,
            note: op.note,
          })
          .select("*")
          .single();
        if (error) fail(error);
        // Troca o registro temporário pelo registro oficial.
        await cacheEmotion(userId, mapEmotion(data as Row), op.localId);
        return;
      }
      case "help_request": {
        const { data, error } = await client
          .from("help_requests")
          .insert({ dependent_id: op.dependentId, message: op.message })
          .select("*")
          .single();
        if (error) fail(error);
        void dispatchPush({ table: "help_requests", record: data as Row });
        await cacheHelp(userId, mapHelpRequest(data as Row), op.localId);
        return;
      }
      case "help_ack": {
        const { data, error } = await client
          .from("help_requests")
          .update({ acknowledged_at: op.at, acknowledged_by: op.byName })
          .eq("id", op.id)
          .select("*")
          .single();
        if (error) fail(error);
        await cacheHelp(userId, mapHelpRequest(data as Row));
        return;
      }
      case "notification_read": {
        const { error } = await client
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", op.id)
          .is("read_at", null);
        if (error) fail(error);
        return;
      }
      case "notifications_read_all": {
        const { error } = await client
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .is("read_at", null);
        if (error) fail(error);
        return;
      }
    }
  }

  return {
    mode: "supabase",

    async getUser() {
      if (!isBrowserOffline()) {
        const client = getClient();
        try {
          const { data, error } = await client.auth.getUser();
          if (data.user) return await loadUser(data.user);
          if (error && !isOfflineError(error)) return null;
        } catch (cause) {
          if (!isOfflineError(cause)) return null;
        }
      }
      // Sem internet, a sessão salva no dispositivo continua valendo.
      const saved = await sessionUser();
      return saved ? loadUser(saved) : null;
    },

    onAuthChange(callback) {
      const client = getClient();
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const kind: AuthEvent =
          event === "PASSWORD_RECOVERY"
            ? "password_recovery"
            : event === "SIGNED_IN"
              ? "signed_in"
              : event === "SIGNED_OUT"
                ? "signed_out"
                : event === "USER_UPDATED"
                  ? "user_updated"
                  : event === "TOKEN_REFRESHED"
                    ? "token_refreshed"
                    : event === "INITIAL_SESSION"
                      ? "initial"
                      : "other";
        const current = session?.user;
        if (!current) {
          // Sem internet, o SDK pode emitir sessão nula ao não conseguir
          // renovar o token. A sessão salva no dispositivo continua valendo.
          const stored = kind === "signed_out" ? null : storedSessionUser();
          if (stored) {
            void loadUser(stored).then(
              (user) => callback(user, kind),
              () => callback(mapUser(stored), kind),
            );
            return;
          }
          callback(null, kind);
          return;
        }
        void loadUser(current).then(
          (user) => callback(user, kind),
          () => callback(mapUser(current), kind),
        );
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      if (isBrowserOffline()) {
        throw new Error("Você está offline. Conecte-se à internet para entrar na conta.");
      }
      const client = getClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) fail(error);
      if (!data.user) throw new Error("Não foi possível entrar. Tente novamente.");
      return loadUser(data.user);
    },

    async signUp(input: SignUpInput): Promise<SignUpResult> {
      if (isBrowserOffline()) {
        throw new Error("Você está offline. Conecte-se à internet para criar a conta.");
      }
      const client = getClient();
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          // O e-mail de confirmação volta para a tela de entrada do app.
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${basePath}/entrar`
              : undefined,
          data: {
            name: input.name,
            role: input.role,
            ...(input.role === "dependente" ? { age: input.age ?? null } : {}),
          },
        },
      });
      if (error) fail(error);
      return {
        user: data.user ? await loadUser(data.user) : null,
        needsConfirmation: Boolean(data.user && !data.session),
      };
    },

    async signOut() {
      const client = getClient();
      try {
        // Sem internet, encerra apenas neste dispositivo em vez de falhar.
        await client.auth.signOut({ scope: isBrowserOffline() ? "local" : "global" });
      } catch {
        await client.auth.signOut({ scope: "local" });
      }
    },

    async requestPasswordReset(email) {
      if (isBrowserOffline()) {
        throw new Error("Você está offline. Conecte-se à internet para solicitar o e-mail.");
      }
      const client = getClient();
      // O link do e-mail volta para a tela de definição de nova senha. O
      // basePath é necessário quando o app roda em um subdiretório.
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${basePath}/redefinir-senha`
          : undefined;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) fail(error);
    },

    async updatePassword(password) {
      if (isBrowserOffline()) {
        throw new Error("Você está offline. Conecte-se à internet para alterar a senha.");
      }
      const client = getClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) fail(error);
    },

    async listDependents() {
      return readWithCache<Dependent[]>("dependents", [], async () => {
        const client = getClient();
        const { data, error } = await client
          .from("dependents")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) fail(error);
        return ((data ?? []) as Row[]).map(mapDependent);
      });
    },

    async createDependent(input: DependentInput) {
      return runWhenOnline(async () => {
        const client = getClient();
        const email = input.email?.trim() || null;
        if (!email) {
          throw new Error(
            "Informe o e-mail da conta do dependente. Só é possível adicionar quem já criou a conta.",
          );
        }

        const details = {
          name: input.name,
          avatar: input.avatar,
          color: input.color,
          email,
          age: input.age,
        };

        // A RPC confere se a conta do dependente existe de verdade e reivindica
        // o espaço dele. Chamar sempre (mesmo já vinculado) evita reaproveitar
        // um perfil antigo cujo e-mail não tem mais conta.
        const { data: claimed, error: claimError } = await client.rpc(
          "claim_dependent_by_email",
          { target_email: email },
        );
        const missingFunction =
          claimError?.code === "PGRST202" ||
          /could not find the function|does not exist|schema cache/i.test(
            claimError?.message ?? "",
          );
        if (missingFunction) {
          throw new Error(
            "Atualize o banco de dados com o arquivo supabase/schema.sql para adicionar dependentes existentes.",
          );
        }
        if (claimError) fail(claimError);

        const row = (Array.isArray(claimed) ? claimed[0] : claimed) as Row | null;
        if (!row?.id) {
          throw new Error(
            "Não encontramos uma conta de dependente disponível com este e-mail. Confira se a pessoa já criou a conta como dependente ou se ela já não está vinculada a outro responsável.",
          );
        }

        const { data, error } = await client
          .from("dependents")
          .update(details)
          .eq("id", text(row.id))
          .select("*")
          .single();
        if (error) fail(error);
        return mapDependent(data as Row);
      }, "Você está offline. Conecte-se à internet para adicionar um dependente.");
    },

    async updateDependent(id, input) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { data, error } = await client
          .from("dependents")
          .update({
            name: input.name,
            avatar: input.avatar,
            color: input.color,
            email: input.email,
            age: input.age,
          })
          .eq("id", id)
          .select("*")
          .single();
        if (error) {
          if (/dependents_email_unique|duplicate key/i.test(error.message)) {
            throw new Error("Já existe outro perfil com este e-mail.");
          }
          fail(error);
        }
        return mapDependent(data as Row);
      }, "Você está offline. Conecte-se à internet para editar o perfil.");
    },

    async deleteDependent(id) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { error } = await client.from("dependents").delete().eq("id", id);
        if (error) fail(error);
      }, "Você está offline. Conecte-se à internet para remover o perfil.");
    },

    async listRoutineItems(dependentId) {
      return readWithCache<RoutineItem[]>("routine", [dependentId], async () => {
        const client = getClient();
        const { data, error } = await client
          .from("routine_items")
          .select("*")
          .eq("dependent_id", dependentId)
          .order("start_time", { ascending: true });
        if (error) fail(error);
        return ((data ?? []) as Row[]).map(mapRoutineItem);
      });
    },

    async createRoutineItem(dependentId, input) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { data, error } = await client
          .from("routine_items")
          .insert({
            dependent_id: dependentId,
            title: input.title,
            emoji: input.emoji,
            start_time: input.startTime,
            days: input.days,
            duration_min: input.durationMin,
          })
          .select("*")
          .single();
        if (error) fail(error);
        return mapRoutineItem(data as Row);
      });
    },

    async updateRoutineItem(id, input) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { data, error } = await client
          .from("routine_items")
          .update({
            title: input.title,
            emoji: input.emoji,
            start_time: input.startTime,
            days: input.days,
            duration_min: input.durationMin,
          })
          .eq("id", id)
          .select("*")
          .single();
        if (error) fail(error);
        return mapRoutineItem(data as Row);
      });
    },

    async deleteRoutineItem(id) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { error } = await client.from("routine_items").delete().eq("id", id);
        if (error) fail(error);
      });
    },

    async listCompletions(dependentId, from, to) {
      const all = await readWithCache<TaskCompletion[]>(
        "completions",
        [dependentId],
        async () => {
          const client = getClient();
          const { data, error } = await client
            .from("task_completions")
            .select("*")
            .eq("dependent_id", dependentId)
            .gte("completion_date", from)
            .lte("completion_date", to);
          if (error) fail(error);
          return ((data ?? []) as Row[]).map(mapCompletion);
        },
        (fresh, cached) => {
          // O período consultado é a fonte da verdade (inclusive remoções),
          // mas uma conclusão feita offline ainda na fila precisa continuar
          // aparecendo até ser enviada.
          const queued = outboxList().filter(
            (item) => item.op.kind === "completion" && item.op.done,
          );
          const isPending = (item: TaskCompletion) =>
            item.id.startsWith("local-") &&
            queued.some(
              (entry) =>
                entry.op.kind === "completion" &&
                entry.op.dependentId === item.dependentId &&
                entry.op.routineItemId === item.routineItemId &&
                entry.op.date === item.date,
            );
          const freshKeys = new Set(
            fresh.map((item) => `${item.routineItemId}:${item.date}`),
          );
          const kept = (cached ?? []).filter(
            (item) => item.date < from || item.date > to,
          );
          const pending = (cached ?? []).filter(
            (item) =>
              item.date >= from &&
              item.date <= to &&
              isPending(item) &&
              !freshKeys.has(`${item.routineItemId}:${item.date}`),
          );
          return [...kept, ...pending, ...fresh];
        },
      );
      return all.filter((item) => item.date >= from && item.date <= to);
    },

    async setCompletion(dependentId, routineItemId, date, done) {
      const queueLocally = async () => {
        const userId = await queueOperation({
          kind: "completion",
          dependentId,
          routineItemId,
          date,
          done,
        });
        await cacheCompletion(userId, dependentId, routineItemId, date, done);
      };

      if (isBrowserOffline()) {
        await queueLocally();
        return;
      }

      const client = getClient();
      try {
        if (done) {
          const { error } = await client.from("task_completions").upsert(
            {
              dependent_id: dependentId,
              routine_item_id: routineItemId,
              completion_date: date,
            },
            { onConflict: "routine_item_id,completion_date" },
          );
          if (error) fail(error);
        } else {
          const { error } = await client
            .from("task_completions")
            .delete()
            .eq("routine_item_id", routineItemId)
            .eq("completion_date", date);
          if (error) fail(error);
        }
      } catch (cause) {
        if (isOfflineError(cause)) {
          await queueLocally();
          return;
        }
        throw cause;
      }

      const userId = (await sessionUser())?.id;
      if (userId) await cacheCompletion(userId, dependentId, routineItemId, date, done);
    },

    async listEmotions(dependentId, fromIso) {
      const all = await readWithCache<EmotionLog[]>(
        "emotions",
        [dependentId],
        async () => {
          const client = getClient();
          const { data, error } = await client
            .from("emotion_logs")
            .select("*")
            .eq("dependent_id", dependentId)
            .gte("created_at", fromIso)
            .order("created_at", { ascending: false });
          if (error) fail(error);
          return ((data ?? []) as Row[]).map(mapEmotion);
        },
        (fresh, cached) => {
          // Mantém o histórico anterior salvo no dispositivo, além do período,
          // e os registros feitos offline que ainda estão na fila.
          const queuedIds = new Set(
            outboxList()
              .filter((item) => item.op.kind === "emotion")
              .map((item) => (item.op.kind === "emotion" ? item.op.localId : undefined))
              .filter((id): id is string => Boolean(id)),
          );
          const older = (cached ?? []).filter((item) => item.createdAt < fromIso);
          const pending = (cached ?? []).filter(
            (item) => item.createdAt >= fromIso && queuedIds.has(item.id),
          );
          return [...pending, ...fresh, ...older].slice(0, 500);
        },
      );
      return all.filter((item) => item.createdAt >= fromIso);
    },

    async createEmotion(dependentId, input) {
      const saveLocally = async (): Promise<EmotionLog> => {
        const log: EmotionLog = {
          id: localId("emotion"),
          dependentId,
          emotion: input.emotion,
          intensity: input.intensity,
          note: input.note,
          createdAt: new Date().toISOString(),
        };
        const userId = await queueOperation({
          kind: "emotion",
          dependentId,
          emotion: input.emotion,
          intensity: input.intensity,
          note: input.note,
          localId: log.id,
        });
        await cacheEmotion(userId, log);
        return log;
      };

      if (isBrowserOffline()) return saveLocally();

      try {
        const client = getClient();
        const { data, error } = await client
          .from("emotion_logs")
          .insert({
            dependent_id: dependentId,
            emotion: input.emotion,
            intensity: input.intensity,
            note: input.note,
          })
          .select("*")
          .single();
        if (error) fail(error);
        const created = mapEmotion(data as Row);
        const userId = (await sessionUser())?.id;
        if (userId) await cacheEmotion(userId, created);
        return created;
      } catch (cause) {
        if (isOfflineError(cause)) return saveLocally();
        throw cause;
      }
    },

    async listHelpRequests(dependentId) {
      return readWithCache<HelpRequest[]>(
        "help",
        [dependentId ?? "all"],
        async () => {
          const client = getClient();
          let query = client
            .from("help_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          if (dependentId) query = query.eq("dependent_id", dependentId);
          const { data, error } = await query;
          if (error) fail(error);
          return ((data ?? []) as Row[]).map(mapHelpRequest);
        },
        (fresh, cached) => {
          // Pedidos criados ou reconhecidos offline continuam visíveis até a
          // fila ser enviada.
          const queuedIds = new Set<string>();
          for (const item of outboxList()) {
            if (item.op.kind === "help_request" && item.op.localId) {
              queuedIds.add(item.op.localId);
            }
            if (item.op.kind === "help_ack") queuedIds.add(item.op.id);
          }
          const pending = (cached ?? []).filter(
            (item) => item.pending && queuedIds.has(item.id),
          );
          const pendingIds = new Set(pending.map((item) => item.id));
          return [
            ...pending,
            ...fresh.filter((item) => !pendingIds.has(item.id)),
          ];
        },
      );
    },

    async createHelpRequest(dependentId, message) {
      const saveLocally = async (): Promise<HelpRequest> => {
        const request: HelpRequest = {
          id: localId("help"),
          dependentId,
          message: message ?? null,
          createdAt: new Date().toISOString(),
          acknowledgedAt: null,
          acknowledgedBy: null,
          pending: true,
        };
        const userId = await queueOperation({
          kind: "help_request",
          dependentId,
          message: message ?? null,
          localId: request.id,
        });
        await cacheHelp(userId, request);
        return request;
      };

      if (isBrowserOffline()) return saveLocally();

      try {
        const client = getClient();
        const { data, error } = await client
          .from("help_requests")
          .insert({ dependent_id: dependentId, message: message ?? null })
          .select("*")
          .single();
        if (error) fail(error);
        const row = data as Row;
        // O app do dependente está aberto neste momento, então ele consegue
        // acionar o push mesmo que o responsável esteja com o app fechado.
        void dispatchPush({ table: "help_requests", record: row });
        const request = mapHelpRequest(row);
        const userId = (await sessionUser())?.id;
        if (userId) await cacheHelp(userId, request);
        return request;
      } catch (cause) {
        if (isOfflineError(cause)) return saveLocally();
        throw cause;
      }
    },

    async acknowledgeHelpRequest(id, byName) {
      const acknowledgeLocally = async (): Promise<HelpRequest> => {
        const at = new Date().toISOString();
        const userId = await queueOperation({ kind: "help_ack", id, byName, at });
        const cached = cacheRead<HelpRequest[]>(userCacheKey(userId, "help", "all")) ?? [];
        const existing = cached.find((item) => item.id === id);
        if (!existing) {
          return {
            id,
            dependentId: "",
            message: null,
            createdAt: at,
            acknowledgedAt: at,
            acknowledgedBy: byName,
            pending: true,
          };
        }
        const request: HelpRequest = {
          ...existing,
          acknowledgedAt: at,
          acknowledgedBy: byName,
          pending: true,
        };
        await cacheHelp(userId, request);
        return request;
      };

      if (isBrowserOffline()) return acknowledgeLocally();

      try {
        const client = getClient();
        const { data, error } = await client
          .from("help_requests")
          .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: byName })
          .eq("id", id)
          .select("*")
          .single();
        if (error) fail(error);
        const request = mapHelpRequest(data as Row);
        const userId = (await sessionUser())?.id;
        if (userId) await cacheHelp(userId, request);
        return request;
      } catch (cause) {
        if (isOfflineError(cause)) return acknowledgeLocally();
        throw cause;
      }
    },

    subscribeHelpRequests(callback: HelpSubscription) {
      const client = getClient();
      const channel = client
        .channel(`help-requests-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "help_requests" },
          (payload) => callback(mapHelpRequest(payload.new as Row)),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "help_requests" },
          (payload) => callback(mapHelpRequest(payload.new as Row)),
        )
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },

    async linkDependentByCode(code) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { data, error } = await client.rpc("link_dependent_by_code", {
          target_code: code,
        });
        if (error) linkError(error);
        const row = (Array.isArray(data) ? data[0] : data) as Row | null;
        if (!row?.id) linkError({ message: "Código inválido ou não encontrado." });
        return mapDependent(row);
      }, "Você está offline. Conecte-se à internet para vincular um dependente.");
    },

    async regenerateLinkCode(dependentId) {
      return runWhenOnline(async () => {
        const client = getClient();
        const { data, error } = await client.rpc("regenerate_link_code", {
          target_dependent_id: dependentId,
        });
        if (error) linkError(error);
        if (typeof data !== "string" || data.length === 0) {
          throw new Error("Não foi possível gerar um novo código.");
        }
        return data;
      }, "Você está offline. Conecte-se à internet para gerar um novo código.");
    },

    async listNotifications() {
      return readWithCache<AppNotification[]>("notifications", [], async () => {
        const client = getClient();
        const { data, error } = await client
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) fail(error);
        return ((data ?? []) as Row[]).map(mapNotification);
      });
    },

    async markNotificationRead(id) {
      const readAt = new Date().toISOString();
      const markLocally = async () => {
        const userId = await queueOperation({ kind: "notification_read", id });
        await cacheNotifications(userId, (current) =>
          current.map((item) =>
            item.id === id && !item.readAt ? { ...item, readAt } : item,
          ),
        );
      };

      if (isBrowserOffline()) return markLocally();

      try {
        const client = getClient();
        const { error } = await client
          .from("notifications")
          .update({ read_at: readAt })
          .eq("id", id)
          .is("read_at", null);
        if (error) fail(error);
      } catch (cause) {
        if (isOfflineError(cause)) return markLocally();
        throw cause;
      }
      const userId = (await sessionUser())?.id;
      if (userId) {
        await cacheNotifications(userId, (current) =>
          current.map((item) =>
            item.id === id && !item.readAt ? { ...item, readAt } : item,
          ),
        );
      }
    },

    async markAllNotificationsRead() {
      const readAt = new Date().toISOString();
      const markLocally = async () => {
        const userId = await queueOperation({ kind: "notifications_read_all" });
        await cacheNotifications(userId, (current) =>
          current.map((item) => (item.readAt ? item : { ...item, readAt })),
        );
      };

      if (isBrowserOffline()) return markLocally();

      try {
        const client = getClient();
        const { error } = await client
          .from("notifications")
          .update({ read_at: readAt })
          .is("read_at", null);
        if (error) fail(error);
      } catch (cause) {
        if (isOfflineError(cause)) return markLocally();
        throw cause;
      }
      const userId = (await sessionUser())?.id;
      if (userId) {
        await cacheNotifications(userId, (current) =>
          current.map((item) => (item.readAt ? item : { ...item, readAt })),
        );
      }
    },

    subscribeNotifications(callback) {
      const client = getClient();
      // As notificações são pessoais: filtra pelo dono da conta. Só cria o
      // canal depois de resolver o usuário, para nunca entregar um evento
      // destinado a outra conta.
      let channel: ReturnType<typeof client.channel> | null = null;
      let cancelled = false;
      void currentUserId()
        .then((userId) => {
          if (cancelled) return;
          channel = client
            .channel(`notifications-${Math.random().toString(36).slice(2)}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "notifications" },
              (payload) => {
                const notification = mapNotification(payload.new as Row);
                if (notification.recipientId === userId) callback(notification);
              },
            )
            .subscribe();
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
        if (channel) void client.removeChannel(channel);
      };
    },

    subscribeDataChanges(callback) {
      const client = getClient();
      const tables: DataTable[] = [
        "emotion_logs",
        "routine_items",
        "task_completions",
        "dependents",
      ];
      const channel = client.channel(
        `data-changes-${Math.random().toString(36).slice(2)}`,
      );
      tables.forEach((table) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            const row = (payload.new ?? payload.old ?? {}) as Row;
            callback(
              mapDataChange(
                table,
                payload.eventType as DataChange["type"],
                row,
              ),
            );
          },
        );
      });
      channel.subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },

    /**
     * Envia as ações salvas enquanto o app estava sem internet, na ordem em
     * que foram feitas. Para na primeira falha de rede e tenta de novo na
     * próxima reconexão.
     */
    async flushOfflineQueue() {
      if (isBrowserOffline()) return 0;
      const userId = (await sessionUser())?.id;
      if (!userId) return 0;
      const queued = outboxList().filter((item) => item.userId === userId);
      let sent = 0;
      for (const item of queued) {
        try {
          await replayOperation(item.op, userId);
          outboxRemove(item.id);
          sent += 1;
        } catch (cause) {
          if (isOfflineError(cause)) break;
          // Ação inválida (registro removido, permissão etc.): descarta para
          // não travar as próximas da fila.
          outboxRemove(item.id);
        }
      }
      return sent;
    },

    /**
     * Dispara os lembretes do horário pelo banco. Funciona como reforço do
     * pg_cron (e substituto quando ele não está ativo), sempre limitado à
     * própria conta pela função `run_my_task_reminders`.
     */
    async checkTaskReminders() {
      if (isBrowserOffline()) return;
      const client = getClient();
      const { error } = await client.rpc("run_my_task_reminders");
      if (!error) return;
      // Banco ainda sem a atualização do schema: o pg_cron continua tentando.
      if (
        error.code === "PGRST202" ||
        /could not find the function|does not exist|schema cache/i.test(error.message ?? "")
      ) {
        return;
      }
      throw new Error(error.message || "Não foi possível verificar os lembretes.");
    },
  };
}
