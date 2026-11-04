import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Nunito } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AppProvider } from "@/lib/data/provider";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

// O GitHub Pages publica o app em /conectaTEA. O Next não aplica o basePath
// aos arquivos da pasta public/, então montamos esses links manualmente.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: {
    default: "ConectaTEA — autonomia, rotina e conexão",
    template: "%s · ConectaTEA",
  },
  description:
    "Plataforma de apoio à autonomia de pessoas com TEA: rotina visual, sons relaxantes, registro de emoções e pedidos de ajuda conectados ao responsável.",
  applicationName: "ConectaTEA",
  keywords: ["autismo", "TEA", "rotina", "autonomia", "acessibilidade", "cuidador"],
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: `${basePath}/icons/apple-touch-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ConectaTEA",
    statusBarStyle: "default",
  },
  other: {
    // O iOS usa esta meta para abrir o app instalado em tela cheia.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${atkinson.variable} ${nunito.variable}`}>
      <body>
        <ServiceWorkerRegister />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
