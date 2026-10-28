import { EmotionBadge } from "@/components/emotion-badge";
import { getEmotion } from "@/lib/emotions";
import type { EmotionLog } from "@/lib/types";

export function EmotionSummary({
  logs,
  emptyLabel = "Nenhum registro no período.",
}: {
  logs: EmotionLog[];
  emptyLabel?: string;
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  const counts = new Map<string, number>();
  logs.forEach((log) => counts.set(log.emotion, (counts.get(log.emotion) ?? 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = ranked[0]?.[1] ?? 1;
  const topEmotion = getEmotion(ranked[0][0]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
        <div>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-muted">
            Emoção mais frequente
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {topEmotion.emoji}
            </span>
            <span className="font-display text-lg font-extrabold text-ink">{topEmotion.label}</span>
            <EmotionBadge emotionId={topEmotion.id} size="sm" showLabel={false} />
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-black text-ink">{logs.length}</p>
          <p className="text-[0.68rem] font-bold text-muted">
            {logs.length === 1 ? "registro" : "registros"}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {ranked.slice(0, 5).map(([emotionId, count]) => {
          const emotion = getEmotion(emotionId);
          const percent = Math.round((count / logs.length) * 100);
          return (
            <li key={emotionId}>
              <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>{emotion.emoji}</span>
                  {emotion.label}
                </span>
                <span>
                  {count}× · {percent}%
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max((count / max) * 100, 6)}%`,
                    backgroundColor: emotion.color,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
