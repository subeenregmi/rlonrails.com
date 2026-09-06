"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Heatmap } from "./Heatmap";
import { Roundel } from "./Roundel";
import { readDays, streaks } from "@/lib/activity";
import { CURRICULUM } from "@/lib/curriculum";
import { lineProgress, totals, type Progress } from "@/lib/progress";
import { progressStore } from "@/lib/storage";
import { TFL_COLOURS } from "@/lib/tfl";

const card = "rounded-2xl bg-surface shadow-[0_10px_30px_rgba(0,0,0,.08)]";

export function JourneyContent({ progress, onClose }: { progress: Progress; onClose?: () => void }) {
  const sums = totals(CURRICULUM, progress);
  const days = readDays(progress);
  const run = streaks(days);
  const stats = [
    ["Stations read", `${sums.read} / ${sums.total}`],
    ["Essential", `${sums.essentialRead} / ${sums.essentialTotal}`],
    ["Projects", `${sums.projectRead} / ${sums.projectTotal}`],
    ["Resources", `${sums.resourcesDone} / ${sums.resourcesTotal}`],
    ["Current streak", `${run.current} ${run.current === 1 ? "day" : "days"}`],
    ["Longest streak", `${run.longest} ${run.longest === 1 ? "day" : "days"}`],
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className={`overflow-hidden ${card}`}>
        <header className="relative bg-tfl-blue px-6 py-5 text-white shadow-[inset_0_-3px_0_#E32017]">
          {onClose && (
            <button type="button" onClick={onClose} title="Close (Esc)" className="absolute top-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 hover:bg-black/30">
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-[22px] leading-tight">Your journey</h1>
          <p className="mt-1 text-[12.5px] opacity-80">Saved in this browser. Export from the menu to keep a backup or move devices.</p>
        </header>
        <dl className="grid grid-cols-3 gap-px bg-rule sm:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-3.5">
              <dt className="text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">{label}</dt>
              <dd className="mt-1 text-[17px]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`p-4 sm:p-6 ${card}`}>
        <h2 className="mb-4 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Stations read</h2>
        <Heatmap days={days} />
      </section>

      <section className={`p-4 sm:p-6 ${card}`}>
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Lines</h2>
        <ul className="flex flex-col gap-1">
          {CURRICULUM.lines.map((line) => {
            const p = lineProgress(line, progress);
            const colour = TFL_COLOURS[line.tfl];
            return (
              <li key={line.id} className="grid grid-cols-[6px_1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5">
                <span className="h-7 w-1.5 rounded" style={{ background: colour }} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] leading-tight">{line.name}</div>
                  <div className="text-[10.5px] text-ink-faint">{line.phase}</div>
                </div>
                <div className="text-[12.5px] text-ink-soft">{p.read} / {p.total}</div>
                <div className="col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-bar">
                  <div className="h-full rounded-full" style={{ width: `${(100 * p.read) / p.total}%`, background: colour }} />
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
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop fixed inset-0 z-30 overflow-y-auto bg-ink/40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bg-ink/30 sm:p-6 sm:backdrop-blur-md"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="dialog-enter mx-auto w-[880px] max-w-full">
        <JourneyContent progress={progress} onClose={onClose} />
      </div>
    </div>
  );
}

export function Journey() {
  const progress = useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot, progressStore.getServerSnapshot);
  if (!progress) return <main className="min-h-full bg-paper" />;
  return (
    <main className="min-h-full overflow-y-auto bg-paper text-ink">
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-5 px-4 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-[15px] uppercase tracking-[0.07em]">
            <Roundel className="h-9 w-9" />
            RL on Rails
          </Link>
          <Link href="/" className="flex items-center gap-1.5 rounded-full bg-tint px-3.5 py-2 text-[13px] hover:bg-tint-strong">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to the map
          </Link>
        </div>
        <JourneyContent progress={progress} />
      </div>
    </main>
  );
}
