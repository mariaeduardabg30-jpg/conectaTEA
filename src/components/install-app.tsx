"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Download, MonitorDown, MoreVertical, Share } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const agent = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(agent) ||
    (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/.test(agent)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/.test(agent)) return "desktop";
  return "other";
}

/**
 * `display-mode: standalone` é o que o Chrome/Safari usam quando o app foi
 * aberto pelo ícone instalado. Nesse caso não faz sentido oferecer instalar.
 */
function runningStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  if (iosStandalone === true) return true;
  return ["standalone", "fullscreen"].some(
    (mode) =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(`(display-mode: ${mode})`).matches,
  );
}

function subscribeInstalled(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const queries = ["standalone", "fullscreen"].map((mode) =>
    window.matchMedia(`(display-mode: ${mode})`),
  );
  queries.forEach((query) => query.addEventListener("change", onChange));
  window.addEventListener("appinstalled", onChange);
  return () => {
    queries.forEach((query) => query.removeEventListener("change", onChange));
    window.removeEventListener("appinstalled", onChange);
  };
}

/**
 * Botão "Instalar app" com instruções por plataforma. Quando o navegador
 * dispara `beforeinstallprompt`, a instalação acontece com um toque. Caso
 * contrário (iPhone, Firefox, navegador embutido), mostramos o caminho
 * manual — inclusive como remover uma instalação antiga que não abre mais.
 */
export function InstallApp({
  className = "btn-ghost min-h-10 px-3 text-sm",
  compact = false,
  label = "Instalar app",
}: {
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const systemInstalled = useSyncExternalStore(
    subscribeInstalled,
    runningStandalone,
    () => true,
  );
  const [accepted, setAccepted] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("other");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (systemInstalled || accepted) return null;

  const showInstructions = () => {
    setPlatform(detectPlatform());
    setOpen(true);
  };

  const start = async () => {
    if (!prompt) {
      showInstructions();
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        setAccepted(true);
        setOpen(false);
        return;
      }
    } catch {
      // Se o convite nativo falhar, as instruções manuais resolvem.
      showInstructions();
    } finally {
      setPrompt(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void start()}
        className={className}
        aria-label={label}
        title={label}
      >
        <Download className="size-4" aria-hidden />
        {!compact && <span className="hidden sm:inline">{label}</span>}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Instalar o ConectaTEA"
        description="Adicione o app à tela inicial para abrir com um toque, sem passar pelo navegador."
        size="sm"
      >
        <div className="space-y-4">
          {platform === "ios" ? (
            <Step
              icon={<Share className="size-5" aria-hidden />}
              title="iPhone / iPad (Safari)"
              text={
                <>
                  Toque em <strong>Compartilhar</strong> e depois em{" "}
                  <strong>Adicionar à Tela de Início</strong>.
                </>
              }
            />
          ) : platform === "android" ? (
            <Step
              icon={<MoreVertical className="size-5" aria-hidden />}
              title="Android (Chrome)"
              text={
                <>
                  Abra o menu <strong>⋮</strong> e toque em{" "}
                  <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).
                </>
              }
            />
          ) : (
            <Step
              icon={<MonitorDown className="size-5" aria-hidden />}
              title="Computador (Chrome / Edge)"
              text={
                <>
                  Clique no ícone de instalação na barra de endereço ou abra o menu do navegador e
                  escolha <strong>Instalar ConectaTEA</strong>.
                </>
              }
            />
          )}

          <div className="rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3">
            <p className="text-sm font-bold text-accent">O app instalado não abre?</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Apague o ícone antigo do ConectaTEA, abra este site no navegador e instale de novo.
              Instalações feitas antes da mudança de endereço apontam para um link que não existe
              mais e mostram “não foi possível abrir o aplicativo”.
            </p>
          </div>

          <p className="text-[0.68rem] leading-relaxed text-muted">
            O ConectaTEA continua funcionando no navegador mesmo sem instalar. O app instalado usa
            o mesmo endereço, com a mesma conta e os mesmos dados.
          </p>
        </div>
      </Modal>
    </>
  );
}

function Step({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-2/70 px-4 py-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm font-extrabold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{text}</p>
      </div>
    </div>
  );
}
