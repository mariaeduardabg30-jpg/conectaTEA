import type { Backend } from "@/lib/data/backend";
import { addDays, startOfWeek, toDateKey } from "@/lib/date";
import type {
  AppRole,
  AppUser,
  Dependent,
  DependentInput,
  EmotionInput,
  EmotionLog,
  HelpRequest,
  RoutineItem,
  RoutineItemInput,
  TaskCompletion,
} from "@/lib/types";

const DB_KEY = "conectatea.demo.db.v2";
const SESSION_KEY = "conectatea.demo.session.v2";
const ACCOUNTS_KEY = "conectatea.demo.accounts.v1";
const HELP_CHANNEL = "conectatea.help";

/** O dono do perfil fica só no demo; o app não precisa dele na interface. */
type DemoDependent = Dependent & { ownerId: string | null };

type DemoAccount = AppUser & { password: string };

type DemoDatabase = {
  dependents: DemoDependent[];
  routineItems: RoutineItem[];
  completions: TaskCompletion[];
  emotions: EmotionLog[];
  helpRequests: HelpRequest[];
};

type DemoSession = AppUser & { createdAt: string };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function at(daysAgo: number, hour: number, minute = 0): Date {
  const date = addDays(new Date(), -daysAgo);
  date.setHours(hour, minute, 0, 0);
  const now = new Date();
  if (date > now) return new Date(now.getTime() - 15 * 60 * 1000);
  return date;
}

function iso(daysAgo: number, hour: number, minute = 0): string {
  return at(daysAgo, hour, minute).toISOString();
}

function makeRoutineItem(
  dependentId: string,
  title: string,
  emoji: string,
  startTime: string,
  days: number[],
  durationMin = 20,
): RoutineItem {
  return {
    id: uid(),
    dependentId,
    title,
    emoji,
    startTime,
    days,
    durationMin,
    active: true,
    position: 0,
  };
}

function seed(): DemoDatabase {
  const today = new Date();
  const lia: DemoDependent = {
    id: "dep-lia",
    name: "Lia",
    avatar: "🦋",
    color: "#C9B8EA",
    email: "lia@conectatea.app",
    age: 12,
    userId: null,
    ownerId: "demo-responsavel",
    createdAt: iso(120, 9),
  };
  const miguel: DemoDependent = {
    id: "dep-miguel",
    name: "Miguel",
    avatar: "🦖",
    color: "#9FD3C2",
    email: "miguel@conectatea.app",
    age: 10,
    userId: null,
    ownerId: "demo-responsavel",
    createdAt: iso(110, 9),
  };

  const all = [0, 1, 2, 3, 4, 5, 6];
  const weekdays = [1, 2, 3, 4, 5];

  const routineItems: RoutineItem[] = [
    makeRoutineItem(lia.id, "Acordar e escovar os dentes", "🪥", "07:00", all, 15),
    makeRoutineItem(lia.id, "Tomar café da manhã", "🥐", "07:30", all, 25),
    makeRoutineItem(lia.id, "Ir para a escola", "🎒", "08:00", weekdays, 40),
    makeRoutineItem(lia.id, "Almoçar", "🍽️", "12:30", all, 40),
    makeRoutineItem(lia.id, "Momento de leitura", "📚", "15:00", weekdays, 30),
    makeRoutineItem(lia.id, "Jantar em família", "🍲", "18:30", all, 40),
    makeRoutineItem(lia.id, "Rotina do sono", "🌙", "20:30", all, 30),
    makeRoutineItem(lia.id, "Respirar e relaxar", "🧘", "21:00", all, 10),
    makeRoutineItem(miguel.id, "Acordar com calma", "☀️", "07:15", all, 15),
    makeRoutineItem(miguel.id, "Café da manhã", "🥐", "07:45", all, 25),
    makeRoutineItem(miguel.id, "Terapia ocupacional", "🧩", "09:00", [1, 3], 50),
    makeRoutineItem(miguel.id, "Parque ou quintal", "🌳", "16:00", [2, 4, 6], 60),
    makeRoutineItem(miguel.id, "Jantar", "🍲", "19:30", all, 40),
    makeRoutineItem(miguel.id, "História antes de dormir", "📖", "20:30", all, 20),
  ].map((item, index) => ({ ...item, position: index }));

  const completions: TaskCompletion[] = [];
  const firstSeedDay = addDays(startOfWeek(today), -7);
  const cursor = new Date(firstSeedDay);
  let dayCounter = 0;
  while (cursor <= today) {
    const key = toDateKey(cursor);
    const isToday = key === toDateKey(today);
    const scheduled = routineItems.filter((item) => item.days.includes(cursor.getDay()));
    scheduled.forEach((item, index) => {
      const wasCompleted =
        isToday
          ? index < Math.ceil(scheduled.length / 2)
          : (index + dayCounter + cursor.getDate()) % 5 !== 0;
      if (wasCompleted) {
        completions.push({
          id: uid(),
          dependentId: item.dependentId,
          routineItemId: item.id,
          date: key,
          completedAt: new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
            Number(item.startTime.slice(0, 2)),
            Number(item.startTime.slice(3, 5)) + 5,
          ).toISOString(),
        });
      }
    });
    cursor.setDate(cursor.getDate() + 1);
    dayCounter += 1;
  }

  const emotions: EmotionLog[] = [
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "calmo",
      intensity: 4,
      note: "Comecei o dia ouvindo a música que eu gosto.",
      createdAt: at(0, 8, 20).toISOString(),
    },
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "ansioso",
      intensity: 4,
      note: "Teve muito barulho na hora do jantar e eu fiquei agitada.",
      createdAt: at(1, 18, 40).toISOString(),
    },
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "feliz",
      intensity: 5,
      note: "Consegui terminar a atividade de artes sozinha.",
      createdAt: at(2, 15, 10).toISOString(),
    },
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "cansado",
      intensity: 3,
      note: "O dia foi cheio e eu precisei de um tempo em silêncio.",
      createdAt: at(3, 20, 0).toISOString(),
    },
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "sobrecarregado",
      intensity: 5,
      note: "A escola estava muito agitada, com muitos sons ao mesmo tempo.",
      createdAt: at(4, 9, 30).toISOString(),
    },
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "calmo",
      intensity: 4,
      note: "Fiz minha rotina sem pressa e deu tudo certo.",
      createdAt: at(5, 17, 15).toISOString(),
    },
    {
      id: uid(),
      dependentId: lia.id,
      emotion: "animado",
      intensity: 5,
      note: "Brincamos no parque e eu me diverti muito.",
      createdAt: at(6, 19, 20).toISOString(),
    },
    {
      id: uid(),
      dependentId: miguel.id,
      emotion: "animado",
      intensity: 4,
      note: "Acordei antes do despertador para brincar.",
      createdAt: at(0, 7, 50).toISOString(),
    },
    {
      id: uid(),
      dependentId: miguel.id,
      emotion: "cansado",
      intensity: 4,
      note: "Foram muitas atividades hoje e fiquei sem energia.",
      createdAt: at(1, 21, 0).toISOString(),
    },
    {
      id: uid(),
      dependentId: miguel.id,
      emotion: "feliz",
      intensity: 5,
      note: "Ganhei o jogo que a gente inventou.",
      createdAt: at(2, 16, 30).toISOString(),
    },
    {
      id: uid(),
      dependentId: miguel.id,
      emotion: "irritado",
      intensity: 3,
      note: "Não consegui terminar o quebra-cabeça e fiquei frustrado.",
      createdAt: at(4, 14, 0).toISOString(),
    },
    {
      id: uid(),
      dependentId: miguel.id,
      emotion: "calmo",
      intensity: 5,
      note: "Fiquei um tempo com meu cachorro no quintal.",
      createdAt: at(5, 18, 0).toISOString(),
    },
    {
      id: uid(),
      dependentId: miguel.id,
      emotion: "ansioso",
      intensity: 3,
      note: "Eu tinha consulta e fiquei preocupado antes de sair.",
      createdAt: at(6, 10, 0).toISOString(),
    },
  ];

  const helpRequests: HelpRequest[] = [
    {
      id: uid(),
      dependentId: lia.id,
      message: "O barulho está muito forte.",
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
    },
    {
      id: uid(),
      dependentId: miguel.id,
      message: null,
      createdAt: at(1, 16, 20).toISOString(),
      acknowledgedAt: at(1, 16, 24).toISOString(),
      acknowledgedBy: "Família Oliveira",
    },
  ];

  return { dependents: [lia, miguel], routineItems, completions, emotions, helpRequests };
}

function readDb(): DemoDatabase {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) {
      const initial = seed();
      window.localStorage.setItem(DB_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as DemoDatabase;
  } catch {
    return seed();
  }
}

function writeDb(db: DemoDatabase): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function readSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

function writeSession(user: DemoSession | null): void {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(SESSION_KEY);
}

function slugEmail(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function emailName(email: string, role: AppRole): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) return role === "responsavel" ? "Responsável" : "Dependente";
  if (role === "responsavel" && email.toLowerCase() === "familia@conectatea.app") {
    return "Família Oliveira";
  }
  return local.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeSession(input: {
  id?: string;
  email: string;
  name: string;
  role: AppRole;
  age: number | null;
}): DemoSession {
  return {
    id: input.id ?? `demo-${input.role}-${slugEmail(input.email)}`,
    name: input.name,
    email: input.email,
    role: input.role,
    age: input.age,
    createdAt: new Date().toISOString(),
  };
}

function seedAccounts(): DemoAccount[] {
  return [
    {
      id: "demo-responsavel",
      name: "Família Oliveira",
      email: "familia@conectatea.app",
      role: "responsavel",
      age: null,
      password: "demo",
    },
    {
      id: "demo-dependente-lia",
      name: "Lia",
      email: "lia@conectatea.app",
      role: "dependente",
      age: 12,
      password: "demo",
    },
    {
      id: "demo-dependente-miguel",
      name: "Miguel",
      email: "miguel@conectatea.app",
      role: "dependente",
      age: 10,
      password: "demo",
    },
  ];
}

function readAccounts(): DemoAccount[] {
  if (typeof window === "undefined") return seedAccounts();
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      const initial = seedAccounts();
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as DemoAccount[];
  } catch {
    return seedAccounts();
  }
}

function writeAccounts(accounts: DemoAccount[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * No demo, cada dependente precisa de um perfil para abrir a própria área.
 * Se o responsável já criou um perfil com o mesmo e-mail, ele é vinculado;
 * caso contrário, o perfil é criado na hora.
 */
function ensureDependentProfile(user: DemoSession): void {
  const db = readDb();
  const email = user.email.toLowerCase();
  const existing = db.dependents.find(
    (dependent) =>
      dependent.userId === user.id ||
      (dependent.email?.toLowerCase() === email && !dependent.userId),
  );

  if (existing) {
    if (!existing.userId) {
      existing.userId = user.id;
      writeDb(db);
    }
    return;
  }

  db.dependents.push({
    id: uid(),
    name: user.name,
    avatar: "🌱",
    color: "#9FD3C2",
    email: user.email,
    age: user.age,
    userId: user.id,
    ownerId: null,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);
}

function publicDependent(dependent: DemoDependent): Dependent {
  return {
    id: dependent.id,
    name: dependent.name,
    avatar: dependent.avatar,
    color: dependent.color,
    email: dependent.email,
    age: dependent.age,
    userId: dependent.userId,
    createdAt: dependent.createdAt,
  };
}

function validateSignUp(input: {
  role: AppRole;
  name: string;
  email: string;
  password: string;
  age?: number | null;
}): void {
  if (input.name.trim().length < 2) throw new Error("Informe seu nome.");
  if (!input.email.trim() || !input.email.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }
  if (input.password.trim().length < 4) {
    throw new Error("A senha precisa ter pelo menos 4 caracteres.");
  }
  if (input.role === "dependente") {
    if (
      typeof input.age !== "number" ||
      !Number.isInteger(input.age) ||
      input.age < 0 ||
      input.age > 130
    ) {
      throw new Error("Informe uma idade válida.");
    }
  }
}

const delay = (ms = 90) => new Promise((resolve) => setTimeout(resolve, ms));

export function createDemoBackend(): Backend {
  const broadcastHelp = (request: HelpRequest) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<HelpRequest>("conectatea:help", { detail: request }));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(HELP_CHANNEL);
      channel.postMessage(request);
      channel.close();
    }
  };

  return {
    mode: "demo",

    async getUser() {
      await delay(40);
      const session = readSession();
      if (!session) return null;
      return {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        age: session.age,
      };
    },

    onAuthChange() {
      return () => undefined;
    },

    async signIn(email, password, role) {
      await delay(160);
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes("@") || password.trim().length < 4) {
        throw new Error("Informe um e-mail válido e uma senha com pelo menos 4 caracteres.");
      }

      const accounts = readAccounts();
      const account = accounts.find(
        (item) => item.email.toLowerCase() === cleanEmail.toLowerCase(),
      );

      let user: DemoSession;
      if (account) {
        if (account.password !== password) throw new Error("E-mail ou senha incorretos.");
        user = makeSession(account);
      } else {
        // A demonstração aceita qualquer e-mail/senha; o papel vem da aba escolhida.
        const chosenRole: AppRole = role ?? "responsavel";
        user = makeSession({
          email: cleanEmail,
          name: emailName(cleanEmail, chosenRole),
          role: chosenRole,
          age: null,
        });
      }

      writeSession(user);
      if (user.role === "dependente") ensureDependentProfile(user);
      return { ...user };
    },

    async signUp(input) {
      await delay(160);
      validateSignUp(input);
      const cleanEmail = input.email.trim().toLowerCase();
      const accounts = readAccounts();
      if (accounts.some((account) => account.email.toLowerCase() === cleanEmail)) {
        throw new Error("Este e-mail já está cadastrado. Tente entrar.");
      }

      const user = makeSession({
        email: cleanEmail,
        name: input.name.trim(),
        role: input.role,
        age: input.role === "dependente" ? (input.age ?? null) : null,
      });
      accounts.push({ ...user, password: input.password });
      writeAccounts(accounts);
      writeSession(user);
      if (user.role === "dependente") ensureDependentProfile(user);
      return { user: { ...user }, needsConfirmation: false };
    },

    async signOut() {
      writeSession(null);
    },

    async requestPasswordReset(email) {
      await delay(160);
      if (!email.trim() || !email.includes("@")) {
        throw new Error("Informe um e-mail válido.");
      }
      // Demonstração: não há e-mail real para enviar.
    },

    async updatePassword(password) {
      await delay(160);
      if (password.trim().length < 4) {
        throw new Error("A senha precisa ter pelo menos 4 caracteres.");
      }
    },

    async listDependents() {
      await delay(60);
      const session = readSession();
      if (!session) return [];
      const list = readDb().dependents.filter((dependent) => {
        if (session.role === "dependente") {
          return (
            dependent.userId === session.id ||
            (!dependent.userId &&
              dependent.email?.toLowerCase() === session.email.toLowerCase())
          );
        }
        return dependent.ownerId === session.id;
      });
      return list
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(publicDependent);
    },

    async createDependent(input: DependentInput) {
      await delay(120);
      const session = readSession();
      if (!session) throw new Error("Entre novamente para continuar.");
      if (session.role !== "responsavel") {
        throw new Error("Apenas o responsável pode criar perfis de dependentes.");
      }
      const db = readDb();
      const accounts = readAccounts();
      const email = input.email?.trim() || null;
      const linked = email
        ? accounts.find(
            (account) =>
              account.role === "dependente" &&
              account.email.toLowerCase() === email.toLowerCase(),
          )
        : undefined;

      // Se o dependente já criou a própria conta, aproveitamos o espaço que
      // ele ganhou em vez de criar um perfil duplicado.
      const claimable = email
        ? db.dependents.find(
            (dependent) =>
              dependent.ownerId === null &&
              dependent.email?.toLowerCase() === email.toLowerCase(),
          )
        : undefined;

      if (claimable) {
        Object.assign(claimable, {
          name: input.name,
          avatar: input.avatar,
          color: input.color,
          email,
          age: input.age,
          ownerId: session.id,
          userId: linked?.id ?? claimable.userId,
        });
        writeDb(db);
        return publicDependent(claimable);
      }

      if (
        email &&
        db.dependents.some(
          (dependent) => dependent.email?.toLowerCase() === email.toLowerCase(),
        )
      ) {
        throw new Error(
          "Já existe um perfil com este e-mail. Use outro e-mail ou edite o perfil existente.",
        );
      }

      const dependent: DemoDependent = {
        id: uid(),
        name: input.name,
        avatar: input.avatar,
        color: input.color,
        email,
        age: input.age,
        userId: linked?.id ?? null,
        ownerId: session.id,
        createdAt: new Date().toISOString(),
      };
      db.dependents.push(dependent);
      writeDb(db);
      return publicDependent(dependent);
    },

    async updateDependent(id, input) {
      await delay(120);
      const db = readDb();
      const index = db.dependents.findIndex((dependent) => dependent.id === id);
      if (index < 0) throw new Error("Dependente não encontrado.");
      const email = input.email?.trim() || null;
      if (
        email &&
        db.dependents.some(
          (dependent) =>
            dependent.id !== id &&
            dependent.email?.toLowerCase() === email.toLowerCase(),
        )
      ) {
        throw new Error("Já existe outro perfil com este e-mail.");
      }
      const accounts = readAccounts();
      const linked = email
        ? accounts.find(
            (account) =>
              account.role === "dependente" &&
              account.email.toLowerCase() === email.toLowerCase(),
          )
        : undefined;
      db.dependents[index] = {
        ...db.dependents[index],
        name: input.name,
        avatar: input.avatar,
        color: input.color,
        email,
        age: input.age,
        userId: linked?.id ?? null,
      };
      writeDb(db);
      return publicDependent(db.dependents[index]);
    },

    async deleteDependent(id) {
      await delay(120);
      const db = readDb();
      db.dependents = db.dependents.filter((dependent) => dependent.id !== id);
      db.routineItems = db.routineItems.filter((item) => item.dependentId !== id);
      db.completions = db.completions.filter((item) => item.dependentId !== id);
      db.emotions = db.emotions.filter((item) => item.dependentId !== id);
      db.helpRequests = db.helpRequests.filter((item) => item.dependentId !== id);
      writeDb(db);
    },

    async listRoutineItems(dependentId) {
      await delay(60);
      return readDb()
        .routineItems.filter((item) => item.dependentId === dependentId && item.active)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },

    async createRoutineItem(dependentId, input: RoutineItemInput) {
      await delay(120);
      const db = readDb();
      const item: RoutineItem = {
        id: uid(),
        dependentId,
        title: input.title,
        emoji: input.emoji,
        startTime: input.startTime,
        days: [...input.days].sort(),
        durationMin: input.durationMin,
        active: true,
        position: db.routineItems.length,
      };
      db.routineItems.push(item);
      writeDb(db);
      return item;
    },

    async updateRoutineItem(id, input) {
      await delay(120);
      const db = readDb();
      const index = db.routineItems.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("Atividade não encontrada.");
      db.routineItems[index] = {
        ...db.routineItems[index],
        title: input.title,
        emoji: input.emoji,
        startTime: input.startTime,
        days: [...input.days].sort(),
        durationMin: input.durationMin,
      };
      writeDb(db);
      return db.routineItems[index];
    },

    async deleteRoutineItem(id) {
      await delay(100);
      const db = readDb();
      db.routineItems = db.routineItems.filter((item) => item.id !== id);
      db.completions = db.completions.filter((item) => item.routineItemId !== id);
      writeDb(db);
    },

    async listCompletions(dependentId, from, to) {
      await delay(60);
      return readDb().completions.filter(
        (completion) =>
          completion.dependentId === dependentId &&
          completion.date >= from &&
          completion.date <= to,
      );
    },

    async setCompletion(dependentId, routineItemId, date, done) {
      await delay(80);
      const db = readDb();
      db.completions = db.completions.filter(
        (completion) =>
          !(completion.routineItemId === routineItemId && completion.date === date),
      );
      if (done) {
        db.completions.push({
          id: uid(),
          dependentId,
          routineItemId,
          date,
          completedAt: new Date().toISOString(),
        });
      }
      writeDb(db);
    },

    async listEmotions(dependentId, fromIso) {
      await delay(60);
      return readDb()
        .emotions.filter(
          (emotion) => emotion.dependentId === dependentId && emotion.createdAt >= fromIso,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async createEmotion(dependentId, input: EmotionInput) {
      await delay(120);
      const db = readDb();
      const emotion: EmotionLog = {
        id: uid(),
        dependentId,
        emotion: input.emotion,
        intensity: input.intensity,
        note: input.note.trim(),
        createdAt: new Date().toISOString(),
      };
      db.emotions.unshift(emotion);
      writeDb(db);
      return emotion;
    },

    async listHelpRequests(dependentId) {
      await delay(60);
      return readDb()
        .helpRequests.filter(
          (request) => !dependentId || request.dependentId === dependentId,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async createHelpRequest(dependentId, message) {
      await delay(100);
      const db = readDb();
      const request: HelpRequest = {
        id: uid(),
        dependentId,
        message: message?.trim() || null,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        acknowledgedBy: null,
      };
      db.helpRequests.unshift(request);
      writeDb(db);
      broadcastHelp(request);
      return request;
    },

    async acknowledgeHelpRequest(id, byName) {
      await delay(100);
      const db = readDb();
      const request = db.helpRequests.find((item) => item.id === id);
      if (!request) throw new Error("Pedido de ajuda não encontrado.");
      request.acknowledgedAt = new Date().toISOString();
      request.acknowledgedBy = byName;
      writeDb(db);
      // Mantém outras abas e o alerta global em sincronia.
      broadcastHelp(request);
      return request;
    },

    subscribeHelpRequests(callback) {
      if (typeof window === "undefined") return () => undefined;
      const localHandler = (event: Event) => {
        callback((event as CustomEvent<HelpRequest>).detail);
      };
      window.addEventListener("conectatea:help", localHandler);
      const channel =
        "BroadcastChannel" in window ? new BroadcastChannel(HELP_CHANNEL) : null;
      if (channel) {
        channel.onmessage = (event: MessageEvent<HelpRequest>) => callback(event.data);
      }
      return () => {
        window.removeEventListener("conectatea:help", localHandler);
        channel?.close();
      };
    },
  };
}
