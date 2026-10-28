"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createDemoBackend } from "@/lib/data/demo";
import { createSupabaseBackend } from "@/lib/data/supabase";
import type { Backend, SignUpResult } from "@/lib/data/backend";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppUser, Dependent, HelpRequest } from "@/lib/types";

const ACTIVE_DEPENDENT_KEY = "conectatea.active-dependent";

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
  signIn: (email: string, password: string) => Promise<AppUser>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  enterDemo: () => Promise<AppUser>;
  helpSignal: number;
  latestHelp: HelpRequest | null;
  dismissHelpAlert: () => void;
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

  const resetSignedOut = useCallback(() => {
    setDependents([]);
    setActiveId(null);
    setDependentsLoaded(false);
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

  useEffect(() => {
    if (!user) return;
    return backend.subscribeHelpRequests((request) => {
      setLatestHelp(request);
      setHelpSignal((value) => value + 1);
    });
  }, [backend, user]);

  const setActiveDependentId = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_DEPENDENT_KEY, id);
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const current = await backend.signIn(email, password);
      setUser(current);
      return current;
    },
    [backend],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await backend.signUp(name, email, password);
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

  const enterDemo = useCallback(async () => {
    const current = await backend.signIn("familia@conectatea.app", "demo");
    setUser(current);
    return current;
  }, [backend]);

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
      enterDemo,
      helpSignal,
      latestHelp,
      dismissHelpAlert,
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
      enterDemo,
      helpSignal,
      latestHelp,
      dismissHelpAlert,
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
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde um instante e tente novamente.";
  if (/network|fetch/i.test(message)) return "Não foi possível conectar. Verifique sua internet.";
  return message || "Algo deu errado. Tente novamente.";
}
