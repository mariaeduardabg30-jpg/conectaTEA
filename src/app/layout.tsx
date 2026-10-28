import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Nunito } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "ConectaTEA — autonomia, rotina e conexão",
    template: "%s · ConectaTEA",
  },
  description:
    "Plataforma de apoio à autonomia de pessoas com TEA: rotina visual, sons relaxantes, registro de emoções e pedidos de ajuda conectados ao responsável.",
  applicationName: "ConectaTEA",
  keywords: ["autismo", "TEA", "rotina", "autonomia", "acessibilidade", "cuidador"],
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
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
