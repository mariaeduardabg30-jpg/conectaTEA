export type ColorValue = string;

/** Papel da conta que está usando o app. */
export type AppRole = "responsavel" | "dependente";

export type Dependent = {
  id: string;
  name: string;
  avatar: string;
  color: ColorValue;
  /** E-mail usado pelo dependente para entrar na própria conta. */
  email: string | null;
  /** Idade informada no cadastro. */
  age: number | null;
  /** Conta de login vinculada a este perfil (auth.users.id). */
  userId: string | null;
  /**
   * Código único de vinculação (8 caracteres, sem letras/números confusos).
   * O responsável usa esse código para vincular a conta dele a este dependente.
   */
  linkCode: string | null;
  createdAt: string;
};

export type RoutineItem = {
  id: string;
  dependentId: string;
  title: string;
  emoji: string;
  startTime: string; // HH:MM
  days: number[]; // 0 = domingo ... 6 = sábado
  durationMin: number;
  active: boolean;
  position: number;
};

export type TaskCompletion = {
  id: string;
  dependentId: string;
  routineItemId: string;
  date: string; // YYYY-MM-DD
  completedAt: string;
};

export type EmotionLog = {
  id: string;
  dependentId: string;
  emotion: string;
  intensity: number;
  note: string;
  createdAt: string;
};

export type HelpRequest = {
  id: string;
  dependentId: string;
  message: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  /** Idade informada pelo dependente no cadastro (null para responsáveis). */
  age: number | null;
};

export type RoutineItemInput = {
  title: string;
  emoji: string;
  startTime: string;
  days: number[];
  durationMin: number;
};

export type DependentInput = {
  name: string;
  avatar: string;
  color: string;
  email: string | null;
  age: number | null;
};

export type EmotionInput = {
  emotion: string;
  intensity: number;
  note: string;
};

/** Tipos de notificação que o app entrega para o responsável. */
export type NotificationType =
  | "help_request"
  | "task_created"
  | "task_reminder"
  | "task_completed";

export type AppNotification = {
  id: string;
  /** Conta que recebe a notificação (o responsável vinculado). */
  recipientId: string | null;
  /** Dependente que originou o evento. */
  dependentId: string;
  type: NotificationType;
  title: string;
  body: string;
  routineItemId: string | null;
  /** Data a que a notificação se refere (lembrete/conclusão do dia). */
  scheduledDate: string | null;
  readAt: string | null;
  createdAt: string;
};

export type HelpSubscription = (request: HelpRequest) => void;

/** Assinatura de novas notificações. */
export type NotificationSubscription = (notification: AppNotification) => void;
