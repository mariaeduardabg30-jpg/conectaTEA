import type { Backend } from "@/lib/data/backend";
import { addDays, startOfWeek, toDateKey } from "@/lib/date";
import { generateLinkCode, normalizeLinkCode } from "@/lib/link-code";
import type {
  AppNotification,
  AppRole,
  AppUser,
  DataChange,
  Dependent,
  DependentInput,
  EmotionInput,
  EmotionLog,
  HelpRequest,
  NotificationType,
  RoutineItem,
  RoutineItemInput,
  TaskCompletion,
} from "@/lib/types";

const DB_KEY = "conectatea.demo.db.v2";
const SESSION_KEY = "conectatea.demo.session.v2";
const ACCOUNTS_KEY = "conectatea.demo.accounts.v1";
const HELP_CHANNEL = "conectatea.help";
const NOTIFICATION_CHANNEL = "conectatea.notifications";
const DATA_CHANNEL = "conectatea.data";

/** O dono do perfil fica só no demo; o app não precisa dele na interface. */
type DemoDependent = Dependent & { ownerId: string | null };

type DemoAccount = AppUser & { password: string };

type DemoDatabase = {
  dependents: DemoDependent[];
  routineItems: RoutineItem[];
  completions: TaskCompletion[];
  emotions: EmotionLog[];
  helpRequests: HelpRequest[];
  notifications: AppNotification[];
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
    linkCode: generateLinkCode(),
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
    linkCode: generateLinkCode(),
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

  return { dependents: [lia, miguel], routineItems, completions, emotions, helpRequests, notifications: [] };
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
    const parsed = JSON.parse(raw) as DemoDatabase;
    // Bancos criados antes dos códigos de vinculação recebem um código único.
    const existing = new Set(
      parsed.dependents.map((dependent) => dependent.linkCode).filter(Boolean) as string[],
    );
    let migrated = false;
    parsed.dependents = parsed.dependents.map((dependent) => {
      if (dependent.linkCode) return dependent;
      migrated = true;
      const linkCode = generateLinkCode(existing);
      existing.add(linkCode);
      return { ...dependent, linkCode };
    });
    if (!Array.isArray(parsed.notifications)) {
      parsed.notifications = [];
      migrated = true;
    }
    if (migrated) window.localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    return parsed;
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
    // A sessão fica por aba (como se fosse um dispositivo separado), enquanto
    // o banco demo fica no localStorage compartilhado — assim responsável e
    // dependente podem usar duas abas na mesma máquina.
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

function writeSession(user: DemoSession | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    // Limpa a sessão antiga compartilhada entre abas, de versões anteriores.
    window.localStorage.removeItem(SESSION_KEY);
  } else {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

function slugEmail(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    linkCode: generateLinkCode(new Set(db.dependents.map((dependent) => dependent.linkCode ?? ""))),
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
    linkCode: dependent.linkCode ?? null,
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

  const broadcastNotification = (notification: AppNotification) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<AppNotification>("conectatea:notification", { detail: notification }),
    );
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(NOTIFICATION_CHANNEL);
      channel.postMessage(notification);
      channel.close();
    }
  };

  const broadcastData = (change: DataChange) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<DataChange>("conectatea:data", { detail: change }));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(DATA_CHANNEL);
      channel.postMessage(change);
      channel.close();
    }
  };

  /**
   * Cria uma notificação para o(s) responsável(is) vinculado(s) a um dependente.
   * O ator é ignorado: quem fez a ação não é avisado sobre ela mesmo.
   * Em produção quem cria as notificações é o banco (triggers); aqui o demo
   * replica o mesmo comportamento.
   */
  const notifyResponsibles = (input: {
    actorId: string | null;
    dependentId: string;
    type: NotificationType;
    title: string;
    body: string;
    routineItemId?: string;
    scheduledDate?: string | null;
  }) => {
    const db = readDb();
    const dependent = db.dependents.find((item) => item.id === input.dependentId);
    const ownerId = dependent?.ownerId ?? null;
    if (!ownerId || ownerId === input.actorId) return;
    // Não duplica: mesma tarefa, mesmo evento, mesma data. Pedidos de ajuda
    // são sempre novos, nunca duplicados.
    if (input.type !== "help_request") {
      const duplicate = db.notifications.some(
        (item) =>
          item.recipientId === ownerId &&
          item.type === input.type &&
          item.routineItemId === (input.routineItemId ?? null) &&
          (item.scheduledDate ?? null) === (input.scheduledDate ?? null),
      );
      if (duplicate) return;
    }
    const notification: AppNotification = {
      id: uid(),
      recipientId: ownerId,
      dependentId: input.dependentId,
      type: input.type,
      title: input.title,
      body: input.body,
      routineItemId: input.routineItemId ?? null,
      scheduledDate: input.scheduledDate ?? null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notification);
    writeDb(db);
    broadcastNotification(notification);
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

    async signIn(email, password) {
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
        throw new Error("E-mail ou senha incorretos. Crie sua conta na aba \"Criar conta\".");
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
      if (!email) {
        throw new Error(
          "Informe o e-mail da conta do dependente. Só é possível adicionar quem já criou a conta.",
        );
      }
      const normalizedEmail = email.toLowerCase();
      const linked = accounts.find(
        (account) =>
          account.role === "dependente" &&
          account.email.toLowerCase() === normalizedEmail,
      );

      // Só é possível adicionar quem já criou a conta de dependente.
      if (!linked) {
        throw new Error(
          "Não encontramos uma conta de dependente com este e-mail. Peça para a pessoa criar a conta em “Sou dependente → Criar conta” e tente novamente.",
        );
      }

      const existing = db.dependents.find(
        (dependent) => dependent.email?.toLowerCase() === normalizedEmail,
      );

      if (existing && existing.ownerId && existing.ownerId !== session.id) {
        throw new Error("Este e-mail já está vinculado a outro responsável.");
      }

      // Se o perfil já existe (do próprio dependente ou desta conta),
      // aproveitamos o espaço em vez de criar um duplicado.
      if (existing) {
        Object.assign(existing, {
          name: input.name,
          avatar: input.avatar,
          color: input.color,
          email,
          age: input.age,
          ownerId: session.id,
          userId: linked.id,
          linkCode: existing.linkCode ?? generateLinkCode(),
        });
        writeDb(db);
        broadcastData({ table: "dependents", type: "UPDATE", dependentId: existing.id });
        return publicDependent(existing);
      }

      const dependent: DemoDependent = {
        id: uid(),
        name: input.name,
        avatar: input.avatar,
        color: input.color,
        email,
        age: input.age,
        userId: linked.id,
        linkCode: generateLinkCode(new Set(db.dependents.map((item) => item.linkCode ?? ""))),
        ownerId: session.id,
        createdAt: new Date().toISOString(),
      };
      db.dependents.push(dependent);
      writeDb(db);
      broadcastData({ table: "dependents", type: "INSERT", dependentId: dependent.id });
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

      // Só aceita um e-mail que pertença a uma conta de dependente existente.
      if (email && !linked) {
        throw new Error(
          "Não encontramos uma conta de dependente com este e-mail. Peça para a pessoa criar a conta em “Sou dependente → Criar conta” e tente novamente.",
        );
      }

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
      broadcastData({ table: "dependents", type: "UPDATE", dependentId: id });
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
      broadcastData({ table: "dependents", type: "DELETE", dependentId: id });
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
      broadcastData({ table: "routine_items", type: "INSERT", dependentId });
      const session = readSession();
      notifyResponsibles({
        actorId: session?.id ?? null,
        dependentId,
        type: "task_created",
        title: "Nova tarefa programada",
        body: `${input.emoji} ${input.title} · ${input.startTime}`,
        routineItemId: item.id,
      });
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
      broadcastData({
        table: "routine_items",
        type: "UPDATE",
        dependentId: db.routineItems[index].dependentId,
      });
      return db.routineItems[index];
    },

    async deleteRoutineItem(id) {
      await delay(100);
      const db = readDb();
      const target = db.routineItems.find((item) => item.id === id);
      db.routineItems = db.routineItems.filter((item) => item.id !== id);
      db.completions = db.completions.filter((item) => item.routineItemId !== id);
      writeDb(db);
      if (target) {
        broadcastData({
          table: "routine_items",
          type: "DELETE",
          dependentId: target.dependentId,
        });
      }
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
        writeDb(db);
        broadcastData({
          table: "task_completions",
          type: "INSERT",
          dependentId,
        });
        const session = readSession();
        const item = db.routineItems.find((entry) => entry.id === routineItemId);
        notifyResponsibles({
          actorId: session?.id ?? null,
          dependentId,
          type: "task_completed",
          title: "Tarefa concluída",
          body: `${item?.emoji ?? "✅"} ${item?.title ?? "Atividade"} foi concluída`,
          routineItemId,
          scheduledDate: date,
        });
        return;
      }
      writeDb(db);
      broadcastData({
        table: "task_completions",
        type: "DELETE",
        dependentId,
      });
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
      broadcastData({ table: "emotion_logs", type: "INSERT", dependentId });
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
      const session = readSession();
      const dependent = db.dependents.find((item) => item.id === dependentId);
      notifyResponsibles({
        actorId: session?.id ?? null,
        dependentId,
        type: "help_request",
        title: "Pedido de ajuda",
        body: `${dependent?.name ?? "Dependente"} pediu ajuda agora`,
      });
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

      // Avisa a conta do dependente que a ajuda está a caminho (equivalente
      // ao gatilho do banco em produção).
      const dependent = db.dependents.find((item) => item.id === request.dependentId);
      if (dependent?.userId) {
        const notification: AppNotification = {
          id: uid(),
          recipientId: dependent.userId,
          dependentId: dependent.id,
          type: "help_acknowledged",
          title: "Ajuda a caminho",
          body: `${byName} viu seu pedido e a ajuda está a caminho.`,
          routineItemId: null,
          scheduledDate: null,
          readAt: null,
          createdAt: new Date().toISOString(),
        };
        db.notifications.unshift(notification);
        writeDb(db);
        broadcastNotification(notification);
      }

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

    async linkDependentByCode(code) {
      await delay(120);
      const session = readSession();
      if (!session) throw new Error("Entre novamente para continuar.");
      if (session.role !== "responsavel") {
        throw new Error("Apenas o responsável pode vincular um dependente.");
      }
      const normalized = normalizeLinkCode(code);
      if (normalized.length !== 8) {
        throw new Error("Código inválido. Confira o código e tente novamente.");
      }
      const db = readDb();
      const target = db.dependents.find(
        (dependent) => normalizeLinkCode(dependent.linkCode ?? "") === normalized,
      );
      if (!target) {
        throw new Error(
          "Código não encontrado. No modo demonstração o código só funciona no mesmo navegador onde a conta do dependente foi criada.",
        );
      }
      // Já vinculado a esta mesma conta: operação idempotente.
      if (target.ownerId === session.id) return publicDependent(target);
      if (target.ownerId) {
        throw new Error("Este dependente já está vinculado a outro responsável.");
      }
      target.ownerId = session.id;
      if (!target.userId && target.email) {
        const account = readAccounts().find(
          (item) =>
            item.role === "dependente" &&
            item.email.toLowerCase() === target.email!.toLowerCase(),
        );
        if (account) target.userId = account.id;
      }
      writeDb(db);
      return publicDependent(target);
    },

    async regenerateLinkCode(dependentId) {
      await delay(120);
      const session = readSession();
      if (!session) throw new Error("Entre novamente para continuar.");
      const db = readDb();
      const target = db.dependents.find((dependent) => dependent.id === dependentId);
      if (!target) throw new Error("Dependente não encontrado.");
      const allowed = target.ownerId === session.id || target.userId === session.id;
      if (!allowed) throw new Error("Sem permissão para alterar este código.");
      target.linkCode = generateLinkCode(
        new Set(db.dependents.map((dependent) => dependent.linkCode ?? "")),
      );
      writeDb(db);
      return target.linkCode;
    },

    async listNotifications() {
      await delay(60);
      const session = readSession();
      if (!session) return [];
      return readDb()
        .notifications.filter((item) => item.recipientId === session.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async markNotificationRead(id) {
      const session = readSession();
      if (!session) return;
      const db = readDb();
      const target = db.notifications.find(
        (item) => item.id === id && item.recipientId === session.id,
      );
      if (target && !target.readAt) {
        target.readAt = new Date().toISOString();
        writeDb(db);
      }
    },

    async markAllNotificationsRead() {
      const session = readSession();
      if (!session) return;
      const db = readDb();
      let changed = false;
      for (const item of db.notifications) {
        if (item.recipientId === session.id && !item.readAt) {
          item.readAt = new Date().toISOString();
          changed = true;
        }
      }
      if (changed) writeDb(db);
    },

    subscribeNotifications(callback) {
      if (typeof window === "undefined") return () => undefined;
      const session = readSession();
      const handle = (notification: AppNotification) => {
        if (session && notification.recipientId === session.id) callback(notification);
      };
      const localHandler = (event: Event) => {
        handle((event as CustomEvent<AppNotification>).detail);
      };
      window.addEventListener("conectatea:notification", localHandler);
      const channel =
        "BroadcastChannel" in window ? new BroadcastChannel(NOTIFICATION_CHANNEL) : null;
      if (channel) {
        channel.onmessage = (event: MessageEvent<AppNotification>) => handle(event.data);
      }
      return () => {
        window.removeEventListener("conectatea:notification", localHandler);
        channel?.close();
      };
    },

    subscribeDataChanges(callback) {
      if (typeof window === "undefined") return () => undefined;
      const localHandler = (event: Event) => {
        callback((event as CustomEvent<DataChange>).detail);
      };
      window.addEventListener("conectatea:data", localHandler);
      const channel = "BroadcastChannel" in window ? new BroadcastChannel(DATA_CHANNEL) : null;
      if (channel) {
        channel.onmessage = (event: MessageEvent<DataChange>) => callback(event.data);
      }
      return () => {
        window.removeEventListener("conectatea:data", localHandler);
        channel?.close();
      };
    },

    // Apenas no modo demonstração: confere as tarefas de hoje e dispara o
    // lembrete perto do horário programado. Em produção, quem cria os
    // lembretes é o banco de dados (função agendada), mesmo com o app fechado.
    async checkTaskReminders() {
      const session = readSession();
      if (!session) return;
      const db = readDb();
      const now = new Date();
      const toMinutes = (time: string) =>
        Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
      const current = now.getHours() * 60 + now.getMinutes();
      const today = now.getDay();
      const dateKey = toDateKey(now);

      // Responsável: recebe o lembrete das atividades dos dependentes que
      // criou/vinculou. Dependente: recebe o lembrete das próprias atividades.
      const targets =
        session.role === "responsavel"
          ? db.dependents
              .filter((dependent) => dependent.ownerId === session.id)
              .map((dependent) => ({ dependent, recipientId: session.id, role: "responsavel" as const }))
          : db.dependents
              .filter((dependent) => dependent.userId === session.id)
              .map((dependent) => ({ dependent, recipientId: session.id, role: "dependente" as const }));

      for (const target of targets) {
        const { dependent } = target;
        const items = db.routineItems.filter((item) => {
          if (item.dependentId !== dependent.id) return false;
          if (!item.active || !item.days.includes(today)) return false;
          const itemStart = toMinutes(item.startTime);
          // Começa 5 minutos antes e tolera até 2 minutos depois do horário.
          return current >= itemStart - 5 && current <= itemStart + 2;
        });
        for (const item of items) {
          const exists = db.notifications.some(
            (notification) =>
              notification.recipientId === target.recipientId &&
              notification.type === "task_reminder" &&
              notification.routineItemId === item.id &&
              notification.scheduledDate === dateKey,
          );
          if (exists) continue;
          const itemStart = toMinutes(item.startTime);
          const body =
            target.role === "dependente"
              ? current < itemStart
                ? `${item.emoji} ${item.title} · começa às ${item.startTime}`
                : `${item.emoji} ${item.title} · é agora!`
              : `${item.emoji} ${item.title} · ${dependent.name}`;
          const notification: AppNotification = {
            id: uid(),
            recipientId: target.recipientId,
            dependentId: dependent.id,
            type: "task_reminder",
            title: "Hora da tarefa",
            body,
            routineItemId: item.id,
            scheduledDate: dateKey,
            readAt: null,
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(notification);
          writeDb(db);
          broadcastNotification(notification);
        }
      }
    },
  };
}
