"use client";

import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { readDays, streaks } from "@/lib/activity";
import { CURRICULUM, rideOrder } from "@/lib/curriculum";
import { lineProgress, lineTally, type Progress, totals } from "@/lib/progress";
import { progressStore } from "@/lib/storage";
import { isLightLine, TFL_COLOURS } from "@/lib/tfl";
import { Heatmap } from "./Heatmap";
import { Roundel } from "./Roundel";

const card = "rounded-2xl bg-surface shadow-[0_10px_30px_rgba(0,0,0,.08)]";
const RIDE_LINES = rideOrder(CURRICULUM);

export function JourneyContent({ progress, onClose }: { progress: Progress; onClose?: () => void }) {
  const sums = totals(CURRICULUM, progress);
  const days = readDays(progress);
  const run = streaks(days);
  const stats = [
    ["Route", `${sums.routeRead} / ${sums.routeTotal}`],
    ["Core", `${sums.coreRead} / ${sums.coreTotal}`],
    ["Exercises", `${sums.exerciseRead} / ${sums.exerciseTotal}`],
    ["Implemented", `${sums.implemented}`],
    ["Current streak", `${run.current} ${run.current === 1 ? "day" : "days"}`],
    ["Longest streak", `${run.longest} ${run.longest === 1 ? "day" : "days"}`],
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className={`overflow-hidden ${card}`}>
        <header className="relative bg-tfl-blue px-6 py-5 text-white shadow-[inset_0_-3px_0_#E32017]">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="absolute top-2.5 right-2.5 flex size-10 items-center justify-center rounded-full bg-black/15 hover:bg-black/30"
            >
              <XMarkIcon className="size-5" />
            </button>
          ) : null}
          <h1 className="text-[22px] leading-tight">Your journey</h1>
          <p className="mt-1 text-[12.5px] opacity-80">
            Saved in this browser. Export from the menu to keep a backup or move devices.
          </p>
        </header>
        <dl className="grid grid-cols-3 gap-px bg-rule sm:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-3.5">
              <dt className="text-[10.5px] text-ink-faint uppercase tracking-[0.1em]">{label}</dt>
              <dd className="mt-1 text-[17px]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`p-4 sm:p-6 ${card}`}>
        <h2 className="mb-4 text-[11px] text-ink-soft uppercase tracking-[0.1em]">Stations read</h2>
        <Heatmap days={days} />
      </section>

      <section className={`p-4 sm:p-6 ${card}`}>
        <h2 className="mb-1 text-[11px] text-ink-soft uppercase tracking-[0.1em]">The progression</h2>
        <p className="mb-4 text-[12.5px] text-ink-soft leading-snug">
          The default order through the map. Experimental practice runs alongside all of it rather than waiting until
          the end.
        </p>
        <ol className="flex flex-col gap-3">
          {CURRICULUM.stages.map((stage, i) => {
            const stageLines = stage.lines
              .map((id) => CURRICULUM.lines.find((l) => l.id === id))
              .filter((l): l is (typeof CURRICULUM.lines)[number] => Boolean(l));
            const read = stageLines.reduce((n, l) => n + lineProgress(l, progress).routeRead, 0);
            const total = stageLines.reduce((n, l) => n + lineProgress(l, progress).routeTotal, 0);
            return (
              <li key={stage.id} className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="mt-px flex size-7 items-center justify-center rounded-full bg-tint text-[12.5px] text-ink-soft">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14.5px] leading-tight">{stage.title}</span>
                    <span className="flex-none text-[12px] text-ink-faint">
                      {read} / {total}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft leading-snug">{stage.content}</p>
                  <p className="mt-1 text-[12.5px] text-ink-faint leading-snug">Ready to move on: {stage.evidence}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {stageLines.map((l) => (
                      <span
                        key={l.id}
                        className="rounded-full px-2 py-px text-[11px] text-white"
                        style={{ background: TFL_COLOURS[l.tfl], color: isLightLine(l.tfl) ? "#1a1a1a" : "#fff" }}
                      >
                        {l.short}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={`p-4 sm:p-6 ${card}`}>
        <h2 className="mb-3 text-[11px] text-ink-soft uppercase tracking-[0.1em]">Lines</h2>
        <ul className="flex flex-col gap-1">
          {RIDE_LINES.map((line) => {
            const tally = lineTally(lineProgress(line, progress));
            const colour = TFL_COLOURS[line.tfl];
            return (
              <li
                key={line.id}
                className="grid grid-cols-[6px_1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5"
              >
                <span className="h-7 w-1.5 rounded" style={{ background: colour }} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] leading-tight">{line.name}</div>
                  <div className="truncate text-[10.5px] text-ink-faint">
                    {line.phase}
                    {tally.note ? ` · ${tally.note}` : null}
                  </div>
                </div>
                <div className="text-[12.5px] text-ink-soft tabular-nums" title={tally.title}>
                  {tally.done} / {tally.need}
                </div>
                <div className="relative col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-bar">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${100 * tally.fraction}%`, background: colour }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function JourneyModal({ open, progress, onClose }: { open: boolean; progress: Progress; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop fixed inset-0 z-30 overflow-y-auto bg-ink/40 pt-[calc(0.75rem+var(--safe-top))] pr-[calc(0.75rem+var(--safe-right))] pb-[calc(0.75rem+var(--safe-bottom))] pl-[calc(0.75rem+var(--safe-left))] sm:bg-ink/30 sm:pt-[calc(1.5rem+var(--safe-top))] sm:pr-[calc(1.5rem+var(--safe-right))] sm:pb-[calc(1.5rem+var(--safe-bottom))] sm:pl-[calc(1.5rem+var(--safe-left))] sm:backdrop-blur-md"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-enter mx-auto w-[880px] max-w-full">
        <JourneyContent progress={progress} onClose={onClose} />
      </div>
    </div>
  );
}

export function Journey() {
  const progress = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
    progressStore.getServerSnapshot,
  );
  if (!progress) return <main className="min-h-full bg-paper" />;
  return (
    <main className="min-h-full overflow-y-auto bg-paper text-ink">
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-5 pt-[calc(1.25rem+var(--safe-top))] pr-[calc(1rem+var(--safe-right))] pb-[calc(2rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] sm:pt-[calc(2rem+var(--safe-top))] sm:pr-[calc(1.5rem+var(--safe-right))] sm:pl-[calc(1.5rem+var(--safe-left))]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-[15px] uppercase tracking-[0.07em]">
            <Roundel className="size-9" />
            RL on Rails
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-tint px-3.5 py-2 text-[13px] hover:bg-tint-strong"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to the map
          </Link>
        </div>
        <JourneyContent progress={progress} />
      </div>
    </main>
  );
}
