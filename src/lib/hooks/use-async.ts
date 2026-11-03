"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (data: T) => void;
};

type AsyncSnapshot<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  deps: DependencyList;
};

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Executa um carregamento assíncrono e expõe estado de carregamento/erro.
 *
 * Quando as dependências mudam (por exemplo, ao trocar o perfil ativo),
 * os dados do contexto anterior são descartados imediatamente para evitar
 * exibir informações de outra pessoa durante o carregamento. Já em uma
 * recarga (`reload`), os dados atuais permanecem visíveis.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  initial: T,
): AsyncState<T> {
  const [snapshot, setSnapshot] = useState<AsyncSnapshot<T>>(() => ({
    data: initial,
    loading: true,
    error: null,
    deps,
  }));
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  const depsRef = useRef(deps);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    depsRef.current = deps;
  }, [deps]);

  useEffect(() => {
    let alive = true;
    loaderRef
      .current()
      .then((result) => {
        if (!alive) return;
        setSnapshot({ data: result, loading: false, error: null, deps });
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setSnapshot((previous) => ({
          data: sameDeps(previous.deps, deps) ? previous.data : initial,
          loading: false,
          error:
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar os dados.",
          deps,
        }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => {
    setSnapshot((previous) => ({ ...previous, loading: true, error: null }));
    setTick((value) => value + 1);
  }, []);

  const setData = useCallback((next: T) => {
    setSnapshot((previous) => ({
      data: next,
      loading: false,
      error: previous.error,
      deps: depsRef.current,
    }));
  }, []);

  const stale = !sameDeps(snapshot.deps, deps);

  return {
    data: stale ? initial : snapshot.data,
    loading: stale ? true : snapshot.loading,
    error: stale ? null : snapshot.error,
    reload,
    setData,
  };
}
