import type {
  AppRole,
  AppUser,
  Dependent,
  DependentInput,
  EmotionInput,
  EmotionLog,
  HelpRequest,
  HelpSubscription,
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
}
