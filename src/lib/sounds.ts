export type SoundId = "chuva" | "oceano" | "floresta" | "vento" | "branco" | "marrom";

export type SoundOption = {
  id: SoundId;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  accent: string;
};

export const SOUNDS: SoundOption[] = [
  {
    id: "chuva",
    name: "Chuva suave",
    emoji: "🌧️",
    description: "Gotas leves e constantes para acalmar.",
    gradient: "linear-gradient(135deg, #DCEBF2 0%, #BFD9E6 100%)",
    accent: "#2C6076",
  },
  {
    id: "oceano",
    name: "Ondas do mar",
    emoji: "🌊",
    description: "Ondas lentas, como respirar fundo.",
    gradient: "linear-gradient(135deg, #D5EEE8 0%, #AFDCCF 100%)",
    accent: "#1F6B5A",
  },
  {
    id: "floresta",
    name: "Floresta",
    emoji: "🌿",
    description: "Folhas ao vento e pássaros distantes.",
    gradient: "linear-gradient(135deg, #E0EBCB 0%, #C2D9A4 100%)",
    accent: "#43632B",
  },
  {
    id: "vento",
    name: "Brisa leve",
    emoji: "🍃",
    description: "Um sopro calmo e contínuo.",
    gradient: "linear-gradient(135deg, #E7ECDD 0%, #CBD9BA 100%)",
    accent: "#4B6040",
  },
  {
    id: "branco",
    name: "Ruído branco",
    emoji: "☁️",
    description: "Som neutro que ajuda a abafar o ambiente.",
    gradient: "linear-gradient(135deg, #F1EEE6 0%, #DED8CA 100%)",
    accent: "#5E5749",
  },
  {
    id: "marrom",
    name: "Ruído marrom",
    emoji: "🟤",
    description: "Grave e profundo, como um abraço sonoro.",
    gradient: "linear-gradient(135deg, #EADFD3 0%, #D5C0AC 100%)",
    accent: "#6B4C34",
  },
];

export const TIMER_OPTIONS = [
  { value: 0, label: "Sem parar" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
] as const;
