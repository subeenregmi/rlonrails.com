"use client";

import { useEffect, useId, useRef } from "react";
import { CURRICULUM, isTrackLine, type Line, lineSummary } from "@/lib/curriculum";
import { cx } from "@/lib/cx";
import { trackStops } from "@/lib/progress";
import { TFL_COLOURS } from "@/lib/tfl";
import { Tick } from "./Tick";

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
  const titleId = useId();
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDone]);

  useEffect(() => {
    if (open) doneRef.current?.focus();
  }, [open]);

  if (!open) return null;
  const all = TRACK_LINES.every((line) => tracks.includes(line.id));
  const added = TRACK_LINES.filter((line) => tracks.includes(line.id)).reduce((n, line) => n + trackStops(line), 0);

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-30 overflow-y-auto bg-ink/40 pt-[calc(0.75rem+var(--safe-top))] pr-[calc(0.75rem+var(--safe-right))] pb-[calc(0.75rem+var(--safe-bottom))] pl-[calc(0.75rem+var(--safe-left))] sm:bg-ink/30 sm:pt-[calc(1.5rem+var(--safe-top))] sm:pr-[calc(1.5rem+var(--safe-right))] sm:pb-[calc(1.5rem+var(--safe-bottom))] sm:pl-[calc(1.5rem+var(--safe-left))] sm:backdrop-blur-md"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onDone();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter mx-auto flex w-[720px] max-w-full flex-col overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_70px_rgba(0,0,0,.32)]"
      >
        <header className="bg-tfl-blue p-5 text-white shadow-[inset_0_-3px_0_#E32017] sm:px-6">
          <div className="text-[11px] uppercase tracking-[0.1em] opacity-80">
            {prompted ? "Research sampler complete" : "Your route"}
          </div>
          <h2 id={titleId} className="mt-1 text-[22px] leading-tight">
            Choose your specialisations
          </h2>
          <p className="mt-2 max-w-[54ch] text-[12.5px] leading-snug opacity-85">
            {prompted
              ? "You have had the short introductions to exploration, models, offline RL and imitation. That was the point of them: pick the directions you actually mean to follow."
              : "Pick the directions you actually mean to follow. You can change this at any time from the menu."}
          </p>
        </header>

        <p className="border-rule border-b px-5 py-3 text-[12.5px] text-ink-soft leading-snug sm:px-6">
          Every line stays on the map and stays readable. Choosing one only decides what counts as
          <b className="font-normal text-ink"> your route</b>: its stations join the progress bar and the recommended
          next stop rides through them. Reference stations are the exception — they stay off every route, chosen or not,
          until a project sends you to one.
        </p>

        <ul className="flex max-h-[52dvh] flex-col gap-0.5 overflow-y-auto overscroll-contain p-3 sm:px-4">
          {CURRICULUM.lines.map((line) => (
            <LineRow key={line.id} line={line} on={tracks.includes(line.id)} onToggle={() => onToggle(line.id)} />
          ))}
        </ul>

        <footer className="flex items-center gap-3 border-rule border-t px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onAll}
            className="rounded-full bg-tint px-4 py-2 text-[13px] transition hover:bg-tint-strong active:translate-y-px"
          >
            {all ? "Clear all" : "Select all"}
          </button>
          <span className="hidden min-w-0 flex-1 truncate text-[12px] text-ink-faint sm:block">
            {tracks.length === 0
              ? "Nothing chosen · core stations only"
              : `${tracks.length} chosen · ${added} extra ${added === 1 ? "stop" : "stops"} on your route`}
          </span>
          <button
            ref={doneRef}
            type="button"
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
  // The spine is not a choice, so its box is ticked and disabled rather than
  // absent: the row still reads as one of the same list.
  const fixed = !isTrackLine(line);
  const stops = trackStops(line);

  return (
    <li>
      <label
        className={cx(
          "grid grid-cols-[6px_20px_1fr_auto] items-center gap-x-3 rounded-lg px-2 py-2 transition",
          fixed ? "cursor-default" : "cursor-pointer hover:bg-tint",
          on && !fixed && "bg-tint",
        )}
      >
        <span className="h-full min-h-8 w-1.5 rounded" style={{ background: colour }} />
        <span className="relative flex size-5 items-center justify-center">
          <input
            type="checkbox"
            checked={on || fixed}
            disabled={fixed}
            onChange={onToggle}
            className="size-5 appearance-none rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tfl-blue focus-visible:ring-offset-2"
            style={
              fixed
                ? { borderColor: "var(--locked)", background: "var(--locked)" }
                : { borderColor: colour, background: on ? colour : "var(--surface)" }
            }
          />
          {on || fixed ? <Tick className="pointer-events-none absolute size-3 text-white" /> : null}
        </span>
        <div className="min-w-0">
          <div className={cx("truncate text-[13.5px] leading-tight", fixed && "text-ink-soft")}>{line.name}</div>
          <div className="line-clamp-2 text-[11.5px] text-ink-faint leading-snug">{lineSummary(line)}</div>
        </div>
        <span className="flex-none whitespace-nowrap text-[11px] text-ink-faint">
          {fixed ? "Everyone" : `+${stops} ${stops === 1 ? "stop" : "stops"}`}
        </span>
      </label>
    </li>
  );
}
