"use client";

import { useEffect } from "react";

/**
 * Registra o service worker que deixa o app instalável e com uma página
 * offline. Fica desativado em desenvolvimento para não servir arquivos
 * antigos enquanto o código muda.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    const register = () => {
      void navigator.serviceWorker
        .register(`${basePath}/sw.js`, {
          scope: `${basePath}/`,
          updateViaCache: "none",
        })
        .catch(() => {
          // Sem service worker o app continua funcionando normalmente.
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
