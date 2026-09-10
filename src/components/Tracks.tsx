"use client";

import { useEffect } from "react";
import { CheckIcon } from "@heroicons/react/16/solid";
import { CURRICULUM, isTrackLine, lineSummary, type Line } from "@/lib/curriculum";
import { trackStops } from "@/lib/progress";
import { TFL_COLOURS } from "@/lib/tfl";
import { cx } from "@/lib/cx";

interface TracksModalProps {
  open: boolean;
  tracks: string[];
  /** Set when the picker came up on its own at the end of the research sampler. */
  prompted: boolean;
  onToggle: (lineId: string) => void;
  onAll: () => void;
  onDone: () => void;
}

const TRACK_LINES = CURRICULUM.lines.filter(isTrackLine);

export function TracksModal({ open, tracks, prompted, onToggle, onAll, onDone }: TracksModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onDone(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDone]);

  if (!open) return null;
  const all = TRACK_LINES.every((line) => tracks.includes(line.id));
  const added = TRACK_LINES.filter((line) => tracks.includes(line.id)).reduce((n, line) => n + trackStops(line), 0);

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-30 overflow-y-auto bg-ink/40 pt-[calc(0.75rem+var(--safe-top))] pr-[calc(0.75rem+var(--safe-right))] pb-[calc(0.75rem+var(--safe-bottom))] pl-[calc(0.75rem+var(--safe-left))] sm:bg-ink/30 sm:pt-[calc(1.5rem+var(--safe-top))] sm:pr-[calc(1.5rem+var(--safe-right))] sm:pb-[calc(1.5rem+var(--safe-bottom))] sm:pl-[calc(1.5rem+var(--safe-left))] sm:backdrop-blur-md"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onDone(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="tracks-title" className="dialog-enter mx-auto flex w-[720px] max-w-full flex-col overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_70px_rgba(0,0,0,.32)]">
        <header className="bg-tfl-blue px-5 py-5 text-white shadow-[inset_0_-3px_0_#E32017] sm:px-6">
          <div className="text-[11px] uppercase tracking-[0.1em] opacity-80">{prompted ? "Research sampler complete" : "Your route"}</div>
          <h2 id="tracks-title" className="mt-1 text-[22px] leading-tight">Choose your specialisations</h2>
          <p className="mt-2 max-w-[54ch] text-[12.5px] leading-snug opacity-85">
            {prompted
              ? "You have had the short introductions to exploration, models, offline RL and imitation. That was the point of them: pick the directions you actually mean to follow."
              : "Pick the directions you actually mean to follow. You can change this at any time from the menu."}
          </p>
        </header>

        <p className="border-b border-rule px-5 py-3 text-[12.5px] leading-snug text-ink-soft sm:px-6">
          Every line stays on the map and stays readable. Choosing one only decides what counts as
          <b className="font-normal text-ink"> your route</b>: its stations join the progress bar, the recommended next stop rides through
          them, and the &ldquo;you are here&rdquo; marker stops skipping past them.
        </p>

        <ul className="flex max-h-[52dvh] flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {CURRICULUM.lines.map((line) => (
            <LineRow key={line.id} line={line} on={tracks.includes(line.id)} onToggle={() => onToggle(line.id)} />
          ))}
        </ul>

        <footer className="flex items-center gap-3 border-t border-rule px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onAll}
            className="rounded-full bg-tint px-4 py-2 text-[13px] transition hover:bg-tint-strong active:translate-y-px"
          >
            {all ? "Clear all" : "Select all"}
          </button>
          <span className="hidden min-w-0 flex-1 truncate text-[12px] text-ink-faint sm:block">
            {tracks.length === 0 ? "Nothing chosen · core stations only" : `${tracks.length} chosen · ${added} extra ${added === 1 ? "stop" : "stops"} on your route`}
          </span>
          <button
            type="button"
            autoFocus
            onClick={onDone}
            className="ml-auto rounded-full bg-tfl-blue px-5 py-2 text-[13px] text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-tfl-blue focus-visible:ring-offset-2"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function LineRow({ line, on, onToggle }: { line: Line; on: boolean; onToggle: () => void }) {
  const colour = TFL_COLOURS[line.tfl];
  const stops = isTrackLine(line) ? trackStops(line) : 0;
  const row = "grid w-full grid-cols-[6px_20px_1fr_auto] items-center gap-x-3 rounded-lg px-2 py-2 text-left";
  const bar = "h-full min-h-8 w-1.5 rounded";

  if (!isTrackLine(line)) {
    return (
      <li>
        <div className={row}>
          <span className={bar} style={{ background: colour }} />
          <span className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint" title="On every route">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] leading-tight text-ink-soft">{line.name}</div>
            <div className="line-clamp-2 text-[11.5px] leading-snug text-ink-faint">{lineSummary(line)}</div>
          </div>
          <span className="flex-none text-[11px] whitespace-nowrap text-ink-faint">Everyone</span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={onToggle} aria-pressed={on} className={cx(row, "transition hover:bg-tint", on && "bg-tint")}>
        <span className={bar} style={{ background: colour }} />
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md border-2 text-white transition"
          style={{ borderColor: colour, background: on ? colour : "var(--surface)" }}
        >
          {on && <CheckIcon className="h-3 w-3" />}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] leading-tight">{line.name}</div>
          <div className="line-clamp-2 text-[11.5px] leading-snug text-ink-faint">{lineSummary(line)}</div>
        </div>
        <span className="flex-none text-[11px] whitespace-nowrap text-ink-faint">+{stops} {stops === 1 ? "stop" : "stops"}</span>
      </button>
    </li>
  );
}
