export const DEPENDENT_COLORS = [
  { value: "#9FD3C2", label: "Verde-água" },
  { value: "#C9B8EA", label: "Lilás" },
  { value: "#F7C89B", label: "Pêssego" },
  { value: "#F4AAA3", label: "Coral" },
  { value: "#AFCDEB", label: "Azul" },
  { value: "#E3DC96", label: "Amarelo" },
  { value: "#E9B7D2", label: "Rosa" },
  { value: "#BFD3A5", label: "Verde" },
] as const;

export const DEPENDENT_AVATARS = [
  "🦋",
  "🦖",
  "🐢",
  "🌱",
  "⭐",
  "🐳",
  "🦊",
  "🐼",
  "🌈",
  "🚀",
  "🐙",
  "🌻",
] as const;

export const ROUTINE_EMOJIS = [
  "🪥",
  "🥐",
  "🎒",
  "🍽️",
  "📚",
  "🧩",
  "🧘",
  "🚿",
  "👕",
  "🌙",
  "🏃",
  "🎨",
  "🎵",
  "🐕",
  "💊",
  "🍲",
  "☀️",
  "🧸",
  "📖",
  "🌳",
] as const;

export function readableTextColor(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#1F2E2A";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1F2E2A" : "#FFFFFF";
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
