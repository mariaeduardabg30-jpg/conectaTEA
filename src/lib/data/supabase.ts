import { getSupabase } from "@/lib/supabase/client";
import type { Backend, SignUpResult } from "@/lib/data/backend";
import type {
  AppUser,
  Dependent,
  DependentInput,
  EmotionLog,
  HelpRequest,
  HelpSubscription,
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

function mapUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AppUser {
  const metadataName = user.user_metadata?.name;
  return {
    id: user.id,
    name:
      typeof metadataName === "string" && metadataName.trim()
        ? metadataName
        : (user.email?.split("@")[0] ?? "Responsável"),
    email: user.email ?? "",
  };
}

function mapDependent(row: Row): Dependent {
  return {
    id: text(row.id),
    name: text(row.name, "Dependente"),
    avatar: text(row.avatar, "🌱"),
    color: text(row.color, "#9FD3C2"),
    birthDate: nullableText(row.birth_date),
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

  return {
    mode: "supabase",

    async getUser() {
      const client = getClient();
      const { data } = await client.auth.getUser();
      return data.user ? mapUser(data.user) : null;
    },

    onAuthChange(callback) {
      const client = getClient();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ? mapUser(session.user) : null);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const client = getClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) fail(error);
      if (!data.user) throw new Error("Não foi possível entrar. Tente novamente.");
      return mapUser(data.user);
    },

    async signUp(name, email, password): Promise<SignUpResult> {
      const client = getClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) fail(error);
      return {
        user: data.user ? mapUser(data.user) : null,
        needsConfirmation: Boolean(data.user && !data.session),
      };
    },

    async signOut() {
      const client = getClient();
      await client.auth.signOut();
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
      const { data, error } = await client
        .from("dependents")
        .insert({
          owner_id: ownerId,
          name: input.name,
          avatar: input.avatar,
          color: input.color,
          birth_date: input.birthDate,
        })
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
          birth_date: input.birthDate,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) fail(error);
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
      return mapHelpRequest(data as Row);
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
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
