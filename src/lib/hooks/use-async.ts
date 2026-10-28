"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (data: T) => void;
};

/**
 * Executa um carregamento assíncrono e expõe estado de carregamento/erro.
 * Os dados anteriores permanecem visíveis durante uma recarga.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  initial: T,
): AsyncState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let alive = true;
    loaderRef
      .current()
      .then((result) => {
        if (alive) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (alive) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar os dados.");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setTick((value) => value + 1);
  }, []);

  return { data, loading, error, reload, setData };
}
