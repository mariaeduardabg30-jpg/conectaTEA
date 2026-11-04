import { getSupabase } from "@/lib/supabase/client";
import type { Backend, SignUpInput, SignUpResult } from "@/lib/data/backend";
import type {
  AppRole,
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

  async function loadUser(user: AuthUser): Promise<AppUser> {
    const client = getClient();
    try {
      const { data } = await client
        .from("profiles")
        .select("role, name, age")
        .eq("id", user.id)
        .maybeSingle();
      return mapUser(user, data as ProfileRow);
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
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const current = session?.user;
        if (!current) {
          callback(null);
          return;
        }
        void loadUser(current)
          .then(callback)
          .catch(() => callback(mapUser(current)));
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

      // O dependente pode ter criado a própria conta antes do responsável.
      // Nesse caso já existe uma linha sem owner_id e o e-mail é único; em
      // vez de inserir outra, reivindicamos a linha existente.
      if (email) {
        const { data: claimed, error: claimError } = await client.rpc(
          "claim_dependent_by_email",
          { target_email: email },
        );
        const missingFunction =
          claimError?.code === "PGRST202" ||
          /could not find the function|does not exist|schema cache/i.test(
            claimError?.message ?? "",
          );
        if (claimError && !missingFunction) fail(claimError);
        const row = (Array.isArray(claimed) ? claimed[0] : claimed) as Row | null;
        if (row?.id) {
          const { data, error } = await client
            .from("dependents")
            .update({
              name: input.name,
              avatar: input.avatar,
              color: input.color,
              email,
              age: input.age,
            })
            .eq("id", text(row.id))
            .select("*")
            .single();
          if (error) fail(error);
          return mapDependent(data as Row);
        }
      }

      const { data, error } = await client
        .from("dependents")
        .insert({
          owner_id: ownerId,
          name: input.name,
          avatar: input.avatar,
          color: input.color,
          email,
          age: input.age,
        })
        .select("*")
        .single();
      if (error) {
        if (/dependents_email_unique|duplicate key/i.test(error.message)) {
          throw new Error(
            "Já existe um perfil com este e-mail. Use outro e-mail ou edite o perfil existente.",
          );
        }
        fail(error);
      }
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
  };
}
