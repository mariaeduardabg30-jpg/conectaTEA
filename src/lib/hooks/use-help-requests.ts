"use client";

import { useCallback } from "react";
import { useApp } from "@/lib/data/provider";
import { useAsync } from "@/lib/hooks/use-async";
import type { HelpRequest } from "@/lib/types";

/**
 * Lista pedidos de ajuda. Sem `dependentId`, retorna os pedidos de todos os
 * dependentes da família. Recarrega automaticamente quando chega um novo pedido.
 */
export function useHelpRequests(dependentId?: string) {
  const { backend, helpSignal } = useApp();
  const loader = useCallback(
    () => backend.listHelpRequests(dependentId),
    [backend, dependentId],
  );

  return useAsync<HelpRequest[]>(loader, [backend, dependentId, helpSignal], []);
}
