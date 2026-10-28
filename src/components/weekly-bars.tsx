import { isToday, WEEKDAY_SHORT } from "@/lib/date";

export type DayProgress = {
  date: Date;
  done: number;
  total: number;
};

export function WeeklyBars({
  days,
  compact = false,
}: {
  days: DayProgress[];
  compact?: boolean;
}) {
  const height = compact ? "h-14" : "h-24";

  return (
    <ul className="flex items-end justify-between gap-1.5 sm:gap-2.5" aria-label="Progresso da semana">
      {days.map(({ date, done, total }) => {
        const today = isToday(date);
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <li key={date.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[0.6rem] font-extrabold text-muted" aria-hidden>
              {total > 0 ? `${done}/${total}` : "—"}
            </span>
            <div className={`relative flex w-full max-w-9 items-end rounded-full bg-surface-2 ${height}`}>
              <div
                className={`w-full rounded-full transition-all duration-500 ${
                  today ? "bg-primary" : "bg-primary/45"
                }`}
                style={{ height: total > 0 ? `${Math.max(percentage, 6)}%` : "4%" }}
              />
            </div>
            <span
              className={`text-[0.62rem] font-extrabold uppercase tracking-wide ${
                today ? "text-primary-strong" : "text-muted"
              }`}
              aria-current={today ? "date" : undefined}
            >
              {WEEKDAY_SHORT[date.getDay()]}
            </span>
            <span className="sr-only">
              {`${WEEKDAY_SHORT[date.getDay()]}: ${done} de ${total} atividades concluídas`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
