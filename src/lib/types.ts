export type ColorValue = string;

export type Dependent = {
  id: string;
  name: string;
  avatar: string;
  color: ColorValue;
  birthDate: string | null;
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
  birthDate: string | null;
};

export type EmotionInput = {
  emotion: string;
  intensity: number;
  note: string;
};

export type HelpSubscription = (request: HelpRequest) => void;
