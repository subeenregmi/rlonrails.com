"use client";

import { useEffect, useRef, useState } from "react";
import type { Line } from "@/lib/curriculum";
import type { LineProgress, Totals } from "@/lib/progress";
import { TFL_COLOURS } from "@/lib/tfl";
import { cx } from "@/lib/cx";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/16/solid";
import { Roundel } from "./Roundel";
import { MiniHeatmap } from "./Heatmap";

interface FloatingBarProps {
  totals: Totals;
  trainCount: number;
  lines: Line[];
  progressByLine: Record<string, LineProgress>;
  focusLineId: string | null;
  days: Record<string, number>;
  onJourney: () => void;
  onHoverLine: (id: string | null) => void;
  onPickLine: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onSelectAll: () => void;
}

const tool = "rounded-full bg-tint px-3 py-1.5 text-[13px] text-ink transition hover:bg-tint-strong active:translate-y-px";

export function FloatingBar(props: FloatingBarProps) {
  const { totals, trainCount, lines, progressByLine, focusLineId, days, onJourney, onHoverLine, onPickLine, onExport, onImport, onReset, onSelectAll } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={rootRef} className="floating-bar absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-20 max-w-[calc(100%-2rem)]">
      <div className="flex h-[60px] w-fit items-center gap-2.5 rounded-full bg-tfl-blue pr-2.5 pl-2 text-white shadow-[0_10px_30px_rgba(0,25,168,.28),inset_0_-3px_0_#E32017] sm:gap-3.5">
        <Roundel className="h-11 w-11 flex-none drop-shadow-[0_2px_3px_rgba(0,0,0,.3)]" />
        <h1 className="hidden whitespace-nowrap text-[19px] lowercase leading-none tracking-[0.07em] sm:block">rl on rails</h1>
        <span className="hidden h-6 w-px bg-white/25 sm:block" />
        <div className="flex flex-none items-center gap-2 text-[12.5px]" title={`${totals.read} of ${totals.total} stations read`}>
          <div className="hidden h-2 w-16 overflow-hidden rounded-full bg-white/20 min-[400px]:block sm:w-24">
            <div className={cx("progress-fill h-full rounded-full transition-[width] duration-700", totals.read >= totals.total && "rainbow")} style={{ width: `${(100 * totals.read) / totals.total}%` }} />
          </div>
          <span className="whitespace-nowrap">{totals.read} / {totals.total}</span>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); onJourney(); }}
          title="Your journey"
          className="flex h-9 flex-none items-center rounded-full bg-white/12 px-2.5 transition hover:bg-white/25"
        >
          <MiniHeatmap days={days} />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cx("flex h-9 flex-none items-center gap-1.5 rounded-full px-3.5 text-[13px] transition", open ? "bg-white text-[#111]" : "bg-white/12 hover:bg-white/25")}
        >
          Menu <ChevronDownIcon className={cx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="panel-enter mt-2 grid max-h-[calc(100dvh-12.5rem)] w-[560px] max-w-[calc(100vw-2rem)] grid-cols-1 gap-4 overflow-y-auto overscroll-contain rounded-2xl border border-rule bg-surface p-4 text-ink shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:grid-cols-[1fr_200px]">
          <section className="max-h-[40dvh] overflow-y-auto pr-1 sm:max-h-[60vh]">
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Lines</h2>
            <ul className="flex flex-col gap-0.5">
              {lines.map((line) => {
                const p = progressByLine[line.id];
                const colour = TFL_COLOURS[line.tfl];
                return (
                  <li
                    key={line.id}
                    onMouseEnter={() => onHoverLine(line.id)}
                    onMouseLeave={() => onHoverLine(null)}
                    onClick={() => { onPickLine(line.id); setOpen(false); }}
                    className={cx("grid cursor-pointer grid-cols-[6px_1fr_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-2 py-1.5 transition hover:bg-tint", focusLineId === line.id && "bg-tint")}
                  >
                    <span className="h-7 w-1.5 rounded" style={{ background: colour }} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] leading-tight">
                        {line.name}
                        {p.complete && <CheckIcon className="ml-1 inline h-3.5 w-3.5 align-[-2px]" style={{ color: colour }} />}
                      </div>
                      <div className="text-[10.5px] text-ink-faint">{line.phase}</div>
                    </div>
                    <div className="text-[12px] text-ink-soft">{p.read} / {p.total}</div>
                    <div className="col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-bar">
                      <div className="h-full rounded-full" style={{ width: `${(100 * p.read) / p.total}%`, background: colour }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Progress</h2>
              <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-[12.5px]">
                <dt className="text-ink-soft">Essential</dt><dd className="text-right">{totals.essentialRead} / {totals.essentialTotal}</dd>
                <dt className="text-ink-soft">Projects</dt><dd className="text-right">{totals.projectRead} / {totals.projectTotal}</dd>
                <dt className="text-ink-soft">Resources</dt><dd className="text-right">{totals.resourcesDone} / {totals.resourcesTotal}</dd>
                <dt className="text-ink-soft">Trains running</dt><dd className="text-right">{trainCount}</dd>
              </dl>
            </div>
            <div>
              <h2 className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink-soft">Data</h2>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={tool} onClick={onExport}>Export</button>
                <button type="button" className={tool} onClick={() => fileRef.current?.click()}>Import</button>
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
                {process.env.NODE_ENV !== "production" && (
                  <button type="button" className={tool} onClick={() => { setOpen(false); onSelectAll(); }} title="Mark every station and resource as read">Select all</button>
                )}
                <button type="button" className={`${tool} hover:bg-tfl-red hover:text-white`} onClick={() => { setOpen(false); onReset(); }}>Reset</button>
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
        </div>
      )}
    </div>
  );
}
