export type Emotion = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  text: string;
  hint: string;
};

export const EMOTIONS: Emotion[] = [
  {
    id: "feliz",
    label: "Feliz",
    emoji: "😊",
    color: "#FBE38E",
    text: "#6B5200",
    hint: "Leve, contente, sorrindo",
  },
  {
    id: "calmo",
    label: "Calmo",
    emoji: "😌",
    color: "#CDE8DC",
    text: "#1F5A48",
    hint: "Tranquilo, em paz",
  },
  {
    id: "animado",
    label: "Animado",
    emoji: "🤩",
    color: "#FCD9A8",
    text: "#7A4300",
    hint: "Com energia, empolgado",
  },
  {
    id: "triste",
    label: "Triste",
    emoji: "😢",
    color: "#C9DDF2",
    text: "#1F4B70",
    hint: "Para baixo, com vontade de chorar",
  },
  {
    id: "ansioso",
    label: "Ansioso",
    emoji: "😰",
    color: "#E6D6F2",
    text: "#573378",
    hint: "Preocupado, com o coração acelerado",
  },
  {
    id: "irritado",
    label: "Irritado",
    emoji: "😠",
    color: "#F8C4BC",
    text: "#7A241B",
    hint: "Com raiva, impaciente",
  },
  {
    id: "cansado",
    label: "Cansado",
    emoji: "😴",
    color: "#D8D6EF",
    text: "#3B3668",
    hint: "Sem energia, com sono",
  },
  {
    id: "sobrecarregado",
    label: "Sobrecarregado",
    emoji: "😵‍💫",
    color: "#F3C9D8",
    text: "#771F3F",
    hint: "Muita informação, barulho ou sensação",
  },
  {
    id: "medo",
    label: "Com medo",
    emoji: "😨",
    color: "#CFE5E8",
    text: "#17535C",
    hint: "Assustado, inseguro",
  },
  {
    id: "confuso",
    label: "Confuso",
    emoji: "🤔",
    color: "#E8E0C8",
    text: "#5A4B1C",
    hint: "Sem entender o que está acontecendo",
  },
];

const EMOTION_MAP = new Map(EMOTIONS.map((emotion) => [emotion.id, emotion]));

export function getEmotion(id: string): Emotion {
  return (
    EMOTION_MAP.get(id) ?? {
      id,
      label: "Emoção",
      emoji: "💭",
      color: "#E8E0C8",
      text: "#5A4B1C",
      hint: "",
    }
  );
}

export const INTENSITY_LABELS: Record<number, string> = {
  1: "Um pouquinho",
  2: "Um pouco",
  3: "Médio",
  4: "Muito",
  5: "Muito intenso",
};
