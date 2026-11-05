"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createDemoBackend } from "@/lib/data/demo";
import { createSupabaseBackend } from "@/lib/data/supabase";
import type { Backend, SignUpInput, SignUpResult } from "@/lib/data/backend";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { playHelpAlert, playNotificationTone, playReminderTone } from "@/lib/audio/alerts";
import type {
  AppNotification,
  AppRole,
  AppUser,
  Dependent,
  HelpRequest,
} from "@/lib/types";

const ACTIVE_DEPENDENT_KEY = "conectatea.active-dependent";

/** Destino ao tocar no aviso do navegador, conforme o tipo e o papel da conta. */
function notificationPath(notification: AppNotification, role: AppRole): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (notification.type === "help_request") return `${basePath}/responsavel/ajuda`;
  if (role === "dependente") return `${basePath}/dependente`;
  return notification.type === "help_acknowledged"
    ? `${basePath}/responsavel/ajuda`
    : `${basePath}/responsavel/rotina`;
}

function browserNotify(notification: AppNotification, role: AppRole) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // Com a aba visível, a interface já mostra o alerta.
  if (!document.hidden) return;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const isHelp = notification.type === "help_request";
  try {
    const shown = new Notification(notification.title, {
      body: notification.body,
      icon: `${basePath}/icons/icon-192.png`,
      tag: notification.id,
      requireInteraction: isHelp,
      silent: false,
    });
    shown.onclick = () => {
      window.focus();
      shown.close();
      window.location.assign(notificationPath(notification, role));
    };
  } catch {
    // Alguns navegadores não implementam o construtor sem service worker.
  }
}

type AppContextValue = {
  ready: boolean;
  mode: "supabase" | "demo";
  user: AppUser | null;
  backend: Backend;
  dependents: Dependent[];
  dependentsLoading: boolean;
  dependentsLoaded: boolean;
  activeDependent: Dependent | null;
  setActiveDependentId: (id: string) => void;
  refreshDependents: () => Promise<void>;
  signIn: (email: string, password: string, role?: AppRole) => Promise<AppUser>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  notifications: AppNotification[];
  unreadNotifications: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  helpSignal: number;
  latestHelp: HelpRequest | null;
  dismissHelpAlert: () => void;
  /** Incrementa quando emoções, rotina ou tarefas mudam em tempo real. */
  dataSignal: number;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useMemo<Backend>(
    () => (isSupabaseConfigured ? createSupabaseBackend() : createDemoBackend()),
    [],
  );

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [dependentsLoading, setDependentsLoading] = useState(false);
  const [dependentsLoaded, setDependentsLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [helpSignal, setHelpSignal] = useState(0);
  const [latestHelp, setLatestHelp] = useState<HelpRequest | null>(null);
  const [dataSignal, setDataSignal] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const remindersCheckedAtRef = useRef<number>(0);

  const resetSignedOut = useCallback(() => {
    setDependents([]);
    setActiveId(null);
    setDependentsLoaded(false);
    setLatestHelp(null);
    setNotifications([]);
  }, []);

  useEffect(() => {
    let alive = true;
    backend
      .getUser()
      .then((current) => {
        if (alive) setUser(current);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    const unsubscribe = backend.onAuthChange((current) => {
      if (!alive) return;
      setUser(current);
      if (!current) resetSignedOut();
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [backend, resetSignedOut]);

  const loadDependents = useCallback(async () => {
    const list = await backend.listDependents();
    setDependents(list);
    setActiveId((previous) => {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_DEPENDENT_KEY)
          : null;
      const candidate = previous ?? stored;
      const next = list.some((dependent) => dependent.id === candidate)
        ? candidate
        : (list[0]?.id ?? null);
      if (next && typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_DEPENDENT_KEY, next);
      }
      return next;
    });
    setDependentsLoaded(true);
  }, [backend]);

  const refreshDependents = useCallback(async () => {
    setDependentsLoading(true);
    try {
      await loadDependents();
    } finally {
      setDependentsLoading(false);
      setDependentsLoaded(true);
    }
  }, [loadDependents]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Fora do corpo do efeito para evitar atualizações síncronas em cascata.
    queueMicrotask(() => {
      if (!cancelled) void loadDependents();
    });
    return () => {
      cancelled = true;
    };
  }, [user, loadDependents]);

  const loadNotifications = useCallback(async () => {
    try {
      const list = await backend.listNotifications();
      setNotifications(list);
    } catch {
      setNotifications([]);
    }
  }, [backend]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadNotifications();
    });
    return () => {
      cancelled = true;
    };
  }, [user, loadNotifications]);

  useEffect(() => {
    if (!user) return;
    return backend.subscribeNotifications((notification) => {
      // Cada evento é processado uma única vez por dispositivo.
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        return [notification, ...current];
      });
      if (notification.type === "help_request") {
        // Pedidos de ajuda pedem um alerta acolhedor e alto. O gesto global de
        // desbloqueio de áudio garante que o som toque mesmo com a aba em segundo
        // plano (o Notification também é exibido pelo navegador).
        void playHelpAlert();
      } else if (notification.type === "task_reminder") {
        // Lembrete de atividade: tom mais forte para chamar a atenção do
        // responsável sem transformar o pedido em alarme.
        void playReminderTone();
      } else {
        void playNotificationTone();
      }
      browserNotify(notification, user.role);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(notification.type === "help_request" ? [120, 80, 120] : 60);
      }
      // Atualiza a lista de pedidos de ajuda se a notificação for um pedido.
      if (notification.type === "help_request") setHelpSignal((value) => value + 1);
    });
  }, [backend, user]);

  // O lembrete é gerado pelo banco (pg_cron) e reforçado pelo app aberto,
  // inclusive para a conta do dependente. Assim ele chega mesmo quando a
  // pessoa está em outra página do app e não depende de recarregar a tela.
  useEffect(() => {
    if (!user) return;
    const check = backend.checkTaskReminders;
    if (!check) return;
    const tick = () => {
      const now = Date.now();
      // No máximo uma checagem por minuto.
      if (now - remindersCheckedAtRef.current < 45_000) return;
      remindersCheckedAtRef.current = now;
      void check()
        .then(() => loadNotifications())
        .catch(() => undefined);
    };
    const interval = window.setInterval(tick, 20_000);
    tick();
    return () => window.clearInterval(interval);
  }, [backend, user, loadNotifications]);

  // Se o app abriu depois do pedido de ajuda (ou o Realtime perdeu o evento),
  // ainda mostra o alerta sonoro para pedidos recentes e não acolhidos.
  useEffect(() => {
    if (!user || user.role !== "responsavel") return;
    let cancelled = false;
    void backend
      .listHelpRequests()
      .then((requests) => {
        if (cancelled) return;
        const recent = requests.find((request) => {
          if (request.acknowledgedAt) return false;
          const age = Date.now() - new Date(request.createdAt).getTime();
          return age >= 0 && age <= 15 * 60_000;
        });
        if (recent) {
          setLatestHelp((current) => current ?? recent);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [backend, user]);

  useEffect(() => {
    if (!user) return;
    return backend.subscribeHelpRequests((request) => {
      // Novos pedidos e reconhecimentos atualizam os contadores e os alertas.
      setHelpSignal((value) => value + 1);
      if (request.acknowledgedAt) {
        // Se o alerta em exibição era desse pedido, ele já foi acolhido.
        setLatestHelp((current) => (current?.id === request.id ? null : current));
      } else {
        setLatestHelp(request);
      }
    });
  }, [backend, user]);

  useEffect(() => {
    if (!user) return;
    return backend.subscribeDataChanges((change) => {
      // Perfis alterados também mudam os nomes exibidos na interface.
      if (change.table === "dependents") {
        void loadDependents();
        return;
      }
      setDataSignal((value) => value + 1);
    });
  }, [backend, user, loadDependents]);

  const setActiveDependentId = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_DEPENDENT_KEY, id);
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, role?: AppRole) => {
      const current = await backend.signIn(email, password, role);
      setUser(current);
      return current;
    },
    [backend],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await backend.signUp(input);
      // Sem sessão (e-mail ainda não confirmado), não consideramos o usuário
      // conectado: ele precisa confirmar o cadastro antes de entrar.
      if (result.user && !result.needsConfirmation) setUser(result.user);
      return result;
    },
    [backend],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setUser(null);
    resetSignedOut();
  }, [backend, resetSignedOut]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item)),
      );
      try {
        await backend.markNotificationRead(id);
      } catch {
        // Recarrega do banco se a marcação falhar.
        void loadNotifications();
      }
    },
    [backend, loadNotifications],
  );

  const markAllNotificationsRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt })),
    );
    try {
      await backend.markAllNotificationsRead();
    } catch {
      void loadNotifications();
    }
  }, [backend, loadNotifications]);

  const unreadNotifications = notifications.reduce(
    (total, item) => (item.readAt ? total : total + 1),
    0,
  );

  const dismissHelpAlert = useCallback(() => setLatestHelp(null), []);

  const activeDependent =
    dependents.find((dependent) => dependent.id === activeId) ?? dependents[0] ?? null;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      mode: backend.mode,
      user,
      backend,
      dependents,
      dependentsLoading,
      dependentsLoaded,
      activeDependent,
      setActiveDependentId,
      refreshDependents,
      signIn,
      signUp,
      signOut,
      notifications,
      unreadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      helpSignal,
      latestHelp,
      dismissHelpAlert,
      dataSignal,
    }),
    [
      ready,
      backend,
      user,
      dependents,
      dependentsLoading,
      dependentsLoaded,
      activeDependent,
      setActiveDependentId,
      refreshDependents,
      signIn,
      signUp,
      signOut,
      notifications,
      unreadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      helpSignal,
      latestHelp,
      dismissHelpAlert,
      dataSignal,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp deve ser usado dentro de AppProvider.");
  return context;
}

export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (/user already registered/i.test(message)) {
    return "Este e-mail já está cadastrado. Tente entrar.";
  }
  if (/password should be at least/i.test(message)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (/new password should be different|same as the old password/i.test(message)) {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  if (/weak.?password|password is too weak/i.test(message)) {
    return "Escolha uma senha mais forte, com letras e números.";
  }
  if (/invalid or has expired|email link is invalid|token has expired|otp_expired/i.test(message)) {
    return "O link expirou ou é inválido. Solicite um novo e-mail de recuperação.";
  }
  if (/auth session missing|session.*missing|not authenticated/i.test(message)) {
    return "Sessão de recuperação não encontrada. Solicite um novo link.";
  }
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde um instante e tente novamente.";
  if (/network|fetch/i.test(message)) return "Não foi possível conectar. Verifique sua internet.";
  return message || "Algo deu errado. Tente novamente.";
}
