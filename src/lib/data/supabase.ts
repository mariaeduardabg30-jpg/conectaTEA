import { getSupabase } from "@/lib/supabase/client";
import type { AuthEvent, Backend, SignUpInput, SignUpResult } from "@/lib/data/backend";
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

export function createSupabaseBackend(): Backend {
  const getClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("Supabase não configurado.");
    return client;
  };

  async function currentUserId(): Promise<string> {
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
    const client = getClient();
    try {
      const { data } = await client
        .from("profiles")
        .select("role, name, age")
        .eq("id", user.id)
        .maybeSingle();
      const mapped = mapUser(user, data as ProfileRow);
      await syncTimeZone(user.id);
      return mapped;
    } catch {
      // Sem acesso à tabela de perfis, o metadata ainda identifica a conta.
      return mapUser(user);
    }
  }

  return {
    mode: "supabase",

    async getUser() {
      const client = getClient();
      const { data } = await client.auth.getUser();
      return data.user ? loadUser(data.user) : null;
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
      const client = getClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) fail(error);
      if (!data.user) throw new Error("Não foi possível entrar. Tente novamente.");
      return loadUser(data.user);
    },

    async signUp(input: SignUpInput): Promise<SignUpResult> {
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
      await client.auth.signOut();
    },

    async requestPasswordReset(email) {
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
      const client = getClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) fail(error);
    },

    async listDependents() {
      const client = getClient();
      const { data, error } = await client
        .from("dependents")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) fail(error);
      return ((data ?? []) as Row[]).map(mapDependent);
    },

    async createDependent(input: DependentInput) {
      const client = getClient();
      const ownerId = await currentUserId();
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

      // Já vinculado a esta conta? Atualiza o perfil em vez de duplicar.
      const { data: mine, error: mineError } = await client
        .from("dependents")
        .select("*")
        .eq("owner_id", ownerId);
      if (mineError) fail(mineError);
      const alreadyLinked = ((mine ?? []) as Row[]).find(
        (row) => nullableText(row.email)?.toLowerCase() === email.toLowerCase(),
      );
      if (alreadyLinked) {
        const { data, error } = await client
          .from("dependents")
          .update(details)
          .eq("id", text(alreadyLinked.id))
          .select("*")
          .single();
        if (error) fail(error);
        return mapDependent(data as Row);
      }

      // O dependente precisa ter criado a própria conta antes. A linha dele
      // fica com owner_id nulo e é reivindicada aqui, por e-mail.
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
          "Não encontramos uma conta de dependente disponível com este e-mail. Confira o e-mail ou veja se a conta já não está vinculada a outro responsável.",
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
    },

    async updateDependent(id, input) {
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
    },

    async deleteDependent(id) {
      const client = getClient();
      const { error } = await client.from("dependents").delete().eq("id", id);
      if (error) fail(error);
    },

    async listRoutineItems(dependentId) {
      const client = getClient();
      const { data, error } = await client
        .from("routine_items")
        .select("*")
        .eq("dependent_id", dependentId)
        .order("start_time", { ascending: true });
      if (error) fail(error);
      return ((data ?? []) as Row[]).map(mapRoutineItem);
    },

    async createRoutineItem(dependentId, input) {
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
    },

    async updateRoutineItem(id, input) {
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
    },

    async deleteRoutineItem(id) {
      const client = getClient();
      const { error } = await client.from("routine_items").delete().eq("id", id);
      if (error) fail(error);
    },

    async listCompletions(dependentId, from, to) {
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

    async setCompletion(dependentId, routineItemId, date, done) {
      const client = getClient();
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
        return;
      }
      const { error } = await client
        .from("task_completions")
        .delete()
        .eq("routine_item_id", routineItemId)
        .eq("completion_date", date);
      if (error) fail(error);
    },

    async listEmotions(dependentId, fromIso) {
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

    async createEmotion(dependentId, input) {
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
      return mapEmotion(data as Row);
    },

    async listHelpRequests(dependentId) {
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

    async createHelpRequest(dependentId, message) {
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
      return mapHelpRequest(row);
    },

    async acknowledgeHelpRequest(id, byName) {
      const client = getClient();
      const { data, error } = await client
        .from("help_requests")
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: byName })
        .eq("id", id)
        .select("*")
        .single();
      if (error) fail(error);
      return mapHelpRequest(data as Row);
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
      const client = getClient();
      const { data, error } = await client.rpc("link_dependent_by_code", {
        target_code: code,
      });
      if (error) linkError(error);
      const row = (Array.isArray(data) ? data[0] : data) as Row | null;
      if (!row?.id) linkError({ message: "Código inválido ou não encontrado." });
      return mapDependent(row);
    },

    async regenerateLinkCode(dependentId) {
      const client = getClient();
      const { data, error } = await client.rpc("regenerate_link_code", {
        target_dependent_id: dependentId,
      });
      if (error) linkError(error);
      if (typeof data !== "string" || data.length === 0) {
        throw new Error("Não foi possível gerar um novo código.");
      }
      return data;
    },

    async listNotifications() {
      const client = getClient();
      const { data, error } = await client
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) fail(error);
      return ((data ?? []) as Row[]).map(mapNotification);
    },

    async markNotificationRead(id) {
      const client = getClient();
      const { error } = await client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);
      if (error) fail(error);
    },

    async markAllNotificationsRead() {
      const client = getClient();
      const { error } = await client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) fail(error);
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
     * Dispara os lembretes do horário pelo banco. Funciona como reforço do
     * pg_cron (e substituto quando ele não está ativo), sempre limitado à
     * própria conta pela função `run_my_task_reminders`.
     */
    async checkTaskReminders() {
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
