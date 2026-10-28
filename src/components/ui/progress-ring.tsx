export function ProgressRing({
  done,
  total,
  size = 124,
  color = "#2d6b5e",
  label,
}: {
  done: number;
  total: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const filled = (percentage / 100) * circumference;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${done} de ${total} atividades concluídas (${percentage}%)`}
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#ece4d4" strokeWidth="11" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-black leading-none text-ink">{percentage}%</span>
        <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted">
          {done}/{total}
        </span>
      </div>
    </div>
  );
}
