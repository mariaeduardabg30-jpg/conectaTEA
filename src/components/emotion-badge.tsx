import { getEmotion } from "@/lib/emotions";

export function EmotionBadge({
  emotionId,
  size = "md",
  showLabel = true,
}: {
  emotionId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const emotion = getEmotion(emotionId);
  const padding = size === "sm" ? "px-2 py-0.5 text-[0.68rem]" : size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  const emojiSize = size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${padding}`}
      style={{ backgroundColor: emotion.color, color: emotion.text }}
    >
      <span className={emojiSize} aria-hidden>
        {emotion.emoji}
      </span>
      {showLabel && emotion.label}
    </span>
  );
}

export function EmotionEmoji({ emotionId, className = "text-2xl" }: { emotionId: string; className?: string }) {
  const emotion = getEmotion(emotionId);
  return (
    <span className={className} role="img" aria-label={emotion.label}>
      {emotion.emoji}
    </span>
  );
}
