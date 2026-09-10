"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Line } from "@/lib/curriculum";
import { lineTally, type LineProgress, type Totals } from "@/lib/progress";
import { TFL_COLOURS, isLightLine } from "@/lib/tfl";
import { cx } from "@/lib/cx";
import { CheckIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { Roundel } from "./Roundel";
import { MiniHeatmap } from "./Heatmap";

interface FloatingBarProps {
  totals: Totals;
  trainCount: number;
  lines: Line[];
  progressByLine: Record<string, LineProgress>;
  focusLineId: string | null;
  days: Record<string, number>;
  tracks: string[];
  onToggleTrack: (lineId: string) => void;
  onJourney: () => void;
  onHoverLine: (id: string | null) => void;
  onPickLine: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onSelectAll: () => void;
}

const tool = "rounded-full bg-tint px-3 py-1.5 text-[13px] text-ink transition hover:bg-tint-strong active:translate-y-px";

// Kept in step with the landscape block in globals.css, which owns the folding
// itself. This decides whether the roundel is a real control and whether the
// menu opens as a modal — both only matter once something has been tapped, so
// a stale first paint costs nothing visually.
const COMPACT = "(orientation: landscape) and (max-height: 540px)";

let compactQuery: MediaQueryList | null = null;
const query = () => (compactQuery ??= window.matchMedia(COMPACT));

function useCompact() {
  const subscribe = useCallback((notify: () => void) => {
    query().addEventListener("change", notify);
    return () => query().removeEventListener("change", notify);
  }, []);
  return useSyncExternalStore(subscribe, () => query().matches, () => false);
}

export function FloatingBar(props: FloatingBarProps) {
  const { totals, trainCount, lines, progressByLine, focusLineId, days, tracks, onToggleTrack, onJourney, onHoverLine, onPickLine, onExport, onImport, onReset, onSelectAll } = props;
  const [open, setOpen] = useState(false);
  const [barOpen, setBarOpen] = useState(false);
  const compact = useCompact();
  // A landscape phone has no room under the pill for a dropdown — it would open
  // a couple of centimetres tall — so there the menu becomes a modal over the
  // map instead, sized by the screen rather than by what is left below the bar.
  // It is a descendant of the bar, so while it is up the bar also has to
  // out-rank the journey drawer; the dropdown stays under it as before.
  const modal = compact && open;
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Anything that acts on the map puts the bar away with it, so a landscape
  // phone is back to a full-screen map the moment the choice is made.
  const fold = useCallback(() => { setOpen(false); setBarOpen(false); }, []);

  useEffect(() => {
    if (!open && !barOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) fold();
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") fold(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, barOpen, fold]);

  return (
    <div ref={rootRef} className={cx("floating-bar absolute top-[calc(1rem+var(--safe-top))] left-[calc(1rem+var(--safe-left))] max-w-[calc(100%-2rem-var(--safe-left)-var(--safe-right))]", modal ? "z-30" : "z-20", barOpen && "bar-open")}>
      <div className="bar-pill flex h-[60px] w-fit items-center gap-2.5 rounded-full bg-tfl-blue pr-2.5 pl-2 text-white shadow-[0_10px_30px_rgba(0,25,168,.28),inset_0_-3px_0_#E32017] sm:gap-3.5">
        <button
          type="button"
          className="bar-badge flex-none rounded-full"
          onClick={() => { setBarOpen((v) => !v); setOpen(false); }}
          aria-expanded={compact ? barOpen : undefined}
          aria-label={compact ? (barOpen ? "Hide the controls" : "Show the controls") : undefined}
          aria-hidden={compact ? undefined : true}
          tabIndex={compact ? undefined : -1}
        >
          <Roundel className="h-11 w-11 flex-none drop-shadow-[0_2px_3px_rgba(0,0,0,.3)]" />
        </button>
        <div className="bar-reveal">
          <div className="bar-rest flex items-center gap-2.5 sm:gap-3.5">
            <h1 className="hidden whitespace-nowrap text-[19px] lowercase leading-none tracking-[0.07em] sm:block">rl on rails</h1>
            <span className="hidden h-6 w-px bg-white/25 sm:block" />
            <div className="flex flex-none items-center gap-2 text-[12.5px]" title={`${totals.routeRead} of ${totals.routeTotal} stations on your route · ${totals.read} of ${totals.total} on the whole map`}>
              <div className="hidden h-2 w-16 overflow-hidden rounded-full bg-white/20 min-[400px]:block sm:w-24">
                <div className={cx("progress-fill h-full rounded-full transition-[width] duration-700", totals.routeRead >= totals.routeTotal && "rainbow")} style={{ width: `${(100 * totals.routeRead) / totals.routeTotal}%` }} />
              </div>
              <span className="whitespace-nowrap">{totals.routeRead} / {totals.routeTotal}</span>
            </div>
            <button
              type="button"
              onClick={() => { fold(); onJourney(); }}
              title="Your journey"
              className="flex h-9 flex-none items-center rounded-full bg-white/12 px-2.5 transition hover:bg-white/25"
            >
              <MiniHeatmap days={days} />
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup={compact ? "dialog" : undefined}
              className={cx("flex h-9 flex-none items-center gap-1.5 rounded-full px-3.5 text-[13px] transition", open ? "bg-white text-[#111]" : "bg-white/12 hover:bg-white/25")}
            >
              Menu <ChevronDownIcon className={cx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <Shell modal={modal} onDismiss={fold}>
          <section className={cx("pr-1", modal ? "sm:min-h-0 sm:flex-1 sm:overflow-y-auto" : "max-h-[40dvh] overflow-y-auto sm:max-h-[60vh]")}>
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Lines</h2>
            <ul className="flex flex-col gap-0.5">
              {lines.map((line) => {
                const tally = lineTally(progressByLine[line.id]);
                const colour = TFL_COLOURS[line.tfl];
                return (
                  <li
                    key={line.id}
                    onMouseEnter={() => onHoverLine(line.id)}
                    onMouseLeave={() => onHoverLine(null)}
                    onClick={() => { onPickLine(line.id); fold(); }}
                    className={cx("grid cursor-pointer grid-cols-[6px_1fr_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-2 py-1.5 transition hover:bg-tint", focusLineId === line.id && "bg-tint")}
                  >
                    <span className="h-7 w-1.5 rounded" style={{ background: colour }} />
                    <div className="min-w-0">
                      {/* The tick and the badge sit beside the name rather than
                          inside it, so a long name is what gets clipped. */}
                      <div className="flex min-w-0 items-center gap-1.5 text-[13px] leading-tight">
                        <span className="truncate">{line.name}</span>
                        {tally.complete && <CheckIcon className="h-3.5 w-3.5 flex-none" style={{ color: colour }} />}
                        {line.track && tracks.includes(line.id) && <span className="flex-none rounded-full bg-tint-strong px-1.5 py-px text-[9.5px] uppercase tracking-[0.06em] text-ink-soft">Chosen</span>}
                      </div>
                      <div className="truncate text-[10.5px] text-ink-faint">
                        {line.phase}
                        {tally.note && ` · ${tally.note}`}
                      </div>
                    </div>
                    <div className="text-[12px] text-ink-soft tabular-nums" title={tally.title}>
                      {tally.done} / {tally.need}
                    </div>
                    <div className="relative col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-bar">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${100 * tally.fraction}%`, background: colour }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={cx("flex flex-col gap-4", modal && "sm:min-h-0 sm:w-[200px] sm:flex-none sm:overflow-y-auto")}>
            <div>
              <h2 className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Progress</h2>
              <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-[12.5px]">
                <dt className="text-ink-soft">Core</dt><dd className="text-right">{totals.coreRead} / {totals.coreTotal}</dd>
                {/* Until a specialisation is picked there is no denominator to
                    count against, and "0 / 0" reads as a broken counter. */}
                <dt className="text-ink-soft">Chosen tracks</dt>
                <dd className="text-right">{totals.trackTotal > 0 ? `${totals.trackRead} / ${totals.trackTotal}` : <span className="text-ink-faint">None picked</span>}</dd>
                <dt className="text-ink-soft">Exercises</dt><dd className="text-right">{totals.exerciseRead} / {totals.exerciseTotal}</dd>
                <dt className="text-ink-soft">Implemented</dt><dd className="text-right">{totals.implemented}</dd>
                <dt className="text-ink-soft">Investigated</dt><dd className="text-right">{totals.investigated}</dd>
                <dt className="text-ink-soft">Explored</dt><dd className="text-right">{totals.read} / {totals.total}</dd>
                <dt className="text-ink-soft">Resources</dt><dd className="text-right">{totals.resourcesDone} / {totals.resourcesTotal}</dd>
                <dt className="text-ink-soft">Trains running</dt><dd className="text-right">{trainCount}</dd>
              </dl>
            </div>
            <div>
              <h2 className="mb-1 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Your route</h2>
              <p className="mb-2 text-[11.5px] leading-snug text-ink-faint">Core stations and the exercises on the spine are for everyone. Pick the specialisations you actually intend to do; their stations and exercises then count towards your route.</p>
              <div className="flex flex-wrap gap-1.5">
                {lines.filter((line) => line.track).map((line) => {
                  const on = tracks.includes(line.id);
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => onToggleTrack(line.id)}
                      aria-pressed={on}
                      className={cx("rounded-full border px-2.5 py-1 text-[12px] transition", on ? "border-transparent text-white" : "border-rule text-ink-soft hover:bg-tint")}
                      style={on ? { background: TFL_COLOURS[line.tfl], color: isLightLine(line.tfl) ? "#1a1a1a" : "#fff" } : undefined}
                    >
                      {line.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Data</h2>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={tool} onClick={onExport}>Export</button>
                <button type="button" className={tool} onClick={() => fileRef.current?.click()}>Import</button>
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
                {process.env.NODE_ENV !== "production" && (
                  <button type="button" className={tool} onClick={() => { fold(); onSelectAll(); }} title="Mark every station and resource as read">Select all</button>
                )}
                <button type="button" className={`${tool} hover:bg-tfl-red hover:text-white`} onClick={() => { fold(); onReset(); }}>Reset</button>
              </div>
            </div>
            <p className="text-[11px] leading-snug text-ink-faint">Scroll to pan, pinch or ⌘-scroll to zoom, drag to move. Arrow keys move along a line, space marks a station read.</p>
            <div className="mt-auto flex items-center justify-end gap-3 border-t border-rule pt-3 text-[11px] text-ink-faint">
              <span>Created by <a href="https://subeenregmi.com" target="_blank" rel="noreferrer noopener" className="text-ink-soft underline-offset-2 hover:text-ink hover:underline">subeenregmi.com</a></span>
              <a href="https://github.com/subeenregmi/rlonrails.com" target="_blank" rel="noreferrer noopener" title="GitHub" className="flex h-7 w-7 items-center justify-center rounded-full bg-tint text-ink-soft hover:bg-tint-strong hover:text-ink">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
              </a>
            </div>
          </section>
        </Shell>
      )}
    </div>
  );
}

/*
 * The same menu in two shells. As a dropdown it hangs off the pill and is
 * capped by what is left of the viewport under it; as a modal it is centred
 * over the map, fills the height it is given, and each column scrolls on its
 * own — on a landscape phone the dropdown's cap is barely a menu at all.
 */
function Shell({ modal, onDismiss, children }: { modal: boolean; onDismiss: () => void; children: ReactNode }) {
  const box = "rounded-2xl border border-rule bg-surface p-4 text-ink";
  if (!modal) {
    return (
      <div className={cx("panel-enter mt-2 grid max-h-[calc(100dvh-12.5rem-var(--safe-top)-var(--safe-bottom))] w-[560px] max-w-[calc(100vw-2rem-var(--safe-left)-var(--safe-right))] grid-cols-1 gap-4 overflow-y-auto overscroll-contain shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:grid-cols-[1fr_200px]", box)}>
        {children}
      </div>
    );
  }
  return (
    <div
      className="dialog-backdrop fixed inset-0 flex items-center justify-center bg-ink/40 pt-[calc(0.75rem+var(--safe-top))] pr-[calc(0.75rem+var(--safe-right))] pb-[calc(0.75rem+var(--safe-bottom))] pl-[calc(0.75rem+var(--safe-left))]"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onDismiss(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-title"
        className={cx("dialog-enter flex h-full w-[560px] max-w-full flex-col shadow-[0_24px_70px_rgba(0,0,0,.32)]", box)}
      >
        {/* There is no Escape key on a phone, and the pill is behind the
            backdrop, so the modal carries its own way out. */}
        <header className="mb-3 flex flex-none items-center justify-between">
          <h2 id="menu-title" className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">Menu</h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close the menu"
            className="-my-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink-soft transition hover:bg-tint-strong hover:text-ink"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain sm:flex-row sm:overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
