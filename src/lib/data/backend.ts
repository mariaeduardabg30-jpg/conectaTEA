import type {
  AppNotification,
  AppRole,
  AppUser,
  DataSubscription,
  Dependent,
  DependentInput,
  EmotionInput,
  EmotionLog,
  HelpRequest,
  HelpSubscription,
  NotificationSubscription,
  RoutineItem,
  RoutineItemInput,
  TaskCompletion,
} from "@/lib/types";

export type SignUpInput = {
  role: AppRole;
  name: string;
  email: string;
  password: string;
  /** Obrigatória no cadastro do dependente. */
  age?: number | null;
};

export type SignUpResult = {
  user: AppUser | null;
  needsConfirmation: boolean;
};

export interface Backend {
  mode: "supabase" | "demo";
  getUser(): Promise<AppUser | null>;
  onAuthChange(callback: (user: AppUser | null) => void): () => void;
  /**
   * `role` só é usado pelo modo demonstração, que não tem banco para consultar
   * o papel da conta. No Supabase o papel vem do perfil do usuário.
   */
  signIn(email: string, password: string, role?: AppRole): Promise<AppUser>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  listDependents(): Promise<Dependent[]>;
  createDependent(input: DependentInput): Promise<Dependent>;
  updateDependent(id: string, input: DependentInput): Promise<Dependent>;
  deleteDependent(id: string): Promise<void>;

  listRoutineItems(dependentId: string): Promise<RoutineItem[]>;
  createRoutineItem(dependentId: string, input: RoutineItemInput): Promise<RoutineItem>;
  updateRoutineItem(id: string, input: RoutineItemInput): Promise<RoutineItem>;
  deleteRoutineItem(id: string): Promise<void>;

  listCompletions(dependentId: string, from: string, to: string): Promise<TaskCompletion[]>;
  setCompletion(
    dependentId: string,
    routineItemId: string,
    date: string,
    done: boolean,
  ): Promise<void>;

  listEmotions(dependentId: string, fromIso: string): Promise<EmotionLog[]>;
  createEmotion(dependentId: string, input: EmotionInput): Promise<EmotionLog>;

  listHelpRequests(dependentId?: string): Promise<HelpRequest[]>;
  createHelpRequest(dependentId: string, message?: string): Promise<HelpRequest>;
  acknowledgeHelpRequest(id: string, byName: string): Promise<HelpRequest>;
  subscribeHelpRequests(callback: HelpSubscription): () => void;

  /**
   * Vincula o perfil do dependente ao responsável que chamou, a partir do
   * código de vinculação. Lança erro com mensagem amigável quando o código
   * não existe ou já está vinculado a outro responsável.
   */
  linkDependentByCode(code: string): Promise<Dependent>;
  /** Gera um código novo para o dependente (o anterior deixa de funcionar). */
  regenerateLinkCode(dependentId: string): Promise<string>;

  /** Notificações do usuário logado, da mais recente para a mais antiga. */
  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  subscribeNotifications(callback: NotificationSubscription): () => void;

  /**
   * Avisa quando emoções, rotina, tarefas ou perfis mudam. As telas usam esse
   * sinal para recarregar os dados sem exigir atualização manual da página.
   */
  subscribeDataChanges(callback: DataSubscription): () => void;
  /**
   * Opcional — apenas o modo demonstração implementa. Em produção o lembrete
   * da tarefa é criado pelo banco de dados (função agendada), com o app fechado.
   */
  checkTaskReminders?(): Promise<void>;
}
