import { cx } from "@/lib/cx";
import { dayKey } from "@/lib/activity";

const WEEKS = 53;
const DAY_MS = 86_400_000;
const LEVELS = ["bg-tint", "bg-[#c5cdf0]", "bg-[#8d9de3]", "bg-[#4a60c8]", "bg-tfl-blue"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MINI_LEVELS = ["bg-white/15", "bg-white/40", "bg-white/60", "bg-white/80", "bg-white"];

const level = (count: number) => (count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4);

const dayCells = (days: Record<string, number>, weeks: number, today: Date) => {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end.getTime() - (weeks * 7 - 1 + end.getUTCDay()) * DAY_MS);
  const cells: { key: string; count: number; future: boolean }[] = [];
  for (let t = start.getTime(); t <= end.getTime() + (6 - end.getUTCDay()) * DAY_MS; t += DAY_MS) {
    const key = dayKey(new Date(t));
    cells.push({ key, count: days[key] ?? 0, future: t > end.getTime() });
  }
  return cells;
};

export function MiniHeatmap({ days, weeks = 14, today = new Date() }: { days: Record<string, number>; weeks?: number; today?: Date }) {
  return (
    <span className="grid grid-flow-col grid-rows-7 gap-px">
      {dayCells(days, weeks, today).map((cell) => (
        <span key={cell.key} className={cx("h-[3px] w-[3px] rounded-[1px]", cell.future ? "opacity-0" : MINI_LEVELS[level(cell.count)])} />
      ))}
    </span>
  );
}

export function Heatmap({ days, today = new Date() }: { days: Record<string, number>; today?: Date }) {
  const cells = dayCells(days, WEEKS, today);
  const monthLabels = cells
    .filter((_, i) => i % 7 === 0)
    .map((cell, week) => ({ week, month: new Date(cell.key).getUTCMonth(), day: new Date(cell.key).getUTCDate() }))
    .filter((c) => c.day <= 7 && c.week < WEEKS - 2);
  const total = Object.values(days).reduce((sum, n) => sum + n, 0);

  return (
    <div className="overflow-x-auto">
      <div className="relative ml-8 h-4 text-[10px] text-ink-faint" style={{ width: `${WEEKS * 14}px` }}>
        {monthLabels.map((m) => (
          <span key={m.week} className="absolute" style={{ left: `${m.week * 14}px` }}>{MONTHS[m.month]}</span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-[3px] text-[10px] text-ink-faint">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => <span key={i} className="h-[11px] w-6 leading-[11px]">{label}</span>)}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {cells.map((cell) => (
            <span
              key={cell.key}
              title={cell.future ? undefined : `${cell.key} · ${cell.count} ${cell.count === 1 ? "item" : "items"}`}
              className={cx("h-[11px] w-[11px] rounded-[2px]", cell.future ? "opacity-0" : LEVELS[level(cell.count)])}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-faint">
        <span>{total} {total === 1 ? "item" : "items"} in the last year</span>
        <span className="flex items-center gap-1">
          Less
          {LEVELS.map((cls) => <span key={cls} className={cx("h-[11px] w-[11px] rounded-[2px]", cls)} />)}
          More
        </span>
      </div>
    </div>
  );
}
