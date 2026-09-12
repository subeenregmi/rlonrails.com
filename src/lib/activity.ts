import type { Progress } from "./progress";

const DAY_MS = 86_400_000;

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function readDays(progress: Progress): Record<string, number> {
  const days: Record<string, number> = {};
  for (const station of Object.values(progress.stations)) {
    if (station.status !== "read" || !station.readAt) continue;
    const key = dayKey(new Date(station.readAt));
    days[key] = (days[key] ?? 0) + 1;
  }
  return days;
}

export function streaks(days: Record<string, number>, today = new Date()): { current: number; longest: number } {
  const active = new Set(Object.keys(days).filter((key) => days[key] > 0));
  let longest = 0;
  for (const key of active) {
    if (active.has(dayKey(new Date(Date.parse(key) - DAY_MS)))) continue;
    let length = 0;
    for (let t = Date.parse(key); active.has(dayKey(new Date(t))); t += DAY_MS) length++;
    longest = Math.max(longest, length);
  }
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let current = 0;
  for (
    let t = active.has(dayKey(new Date(start))) ? start : start - DAY_MS;
    active.has(dayKey(new Date(t)));
    t -= DAY_MS
  )
    current++;
  return { current, longest };
}
