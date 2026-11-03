"use client";

import { useCallback } from "react";
import { useApp } from "@/lib/data/provider";
import { useAsync } from "@/lib/hooks/use-async";
import type { HelpRequest } from "@/lib/types";

/**
 * Lista pedidos de ajuda. Sem `dependentId`, retorna os pedidos de todos os
 * dependentes da família. Recarrega automaticamente quando chega um novo pedido
 * ou quando um pedido é reconhecido.
 */
export function useHelpRequests(dependentId?: string) {
  const { backend, helpSignal, user } = useApp();
  const userId = user?.id;
  const loader = useCallback(
    () => (userId ? backend.listHelpRequests(dependentId) : Promise.resolve<HelpRequest[]>([])),
    [backend, dependentId, userId],
  );

  return useAsync<HelpRequest[]>(
    loader,
    [backend, dependentId, helpSignal, userId],
    [],
  );
}
