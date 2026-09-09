"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Line } from "@/lib/curriculum";
import type { LineProgress } from "@/lib/progress";
import { TFL_COLOURS } from "@/lib/tfl";
import { cx } from "@/lib/cx";
import { ChevronUpIcon } from "@heroicons/react/16/solid";

interface JourneyStripProps {
  lines: Line[];
  progressByLine: Record<string, LineProgress>;
  focusLineId: string | null;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}

const TRAIN_WIDTH = 34;

export function JourneyStrip({ lines, progressByLine, focusLineId, onHover, onPick }: JourneyStripProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ fraction: 0, overflow: false });
  // Only landscape phones read this: there the strip is a drawer over the map
  // (see globals.css), everywhere else it is the footer it has always been and
  // the class does nothing.
  const [open, setOpen] = useState(false);
  const drag = useRef<{ startX: number; startLeft: number } | null>(null);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const range = el.scrollWidth - el.clientWidth;
    setScroll({ fraction: range > 0 ? el.scrollLeft / range : 0, overflow: range > 1 });
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (scroller.current) observer.observe(scroller.current);
    return () => observer.disconnect();
  }, [measure]);

  const scrollToFraction = (fraction: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = Math.min(1, Math.max(0, fraction)) * (el.scrollWidth - el.clientWidth);
  };

  const onRailPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = rail.current?.getBoundingClientRect();
    const el = scroller.current;
    if (!bounds || !el) return;
    const usable = bounds.width - TRAIN_WIDTH;
    drag.current = { startX: event.clientX, startLeft: el.scrollLeft };
    if (!(event.target as HTMLElement).closest(".rail-train")) {
      scrollToFraction((event.clientX - bounds.left - TRAIN_WIDTH / 2) / usable);
      drag.current.startLeft = el.scrollLeft;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onRailPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = rail.current?.getBoundingClientRect();
    const el = scroller.current;
    if (!drag.current || !bounds || !el) return;
    const usable = bounds.width - TRAIN_WIDTH;
    const range = el.scrollWidth - el.clientWidth;
    el.scrollLeft = drag.current.startLeft + ((event.clientX - drag.current.startX) / usable) * range;
  };

  const endDrag = () => { drag.current = null; };

  return (
    <footer className={cx("journey-strip flex min-w-0 flex-col border-t border-rule bg-surface", open && "strip-open")}>
      <button
        type="button"
        className="strip-handle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Hide your journey" : "Show your journey"}
      >
        <ChevronUpIcon className="h-4 w-4" />
      </button>
      <div
        ref={rail}
        className={cx("rail relative mt-1.5 mr-[calc(0.875rem+var(--safe-right))] ml-[calc(0.875rem+var(--safe-left))] h-3 cursor-pointer touch-none select-none transition-opacity", !scroll.overflow && "pointer-events-none opacity-0")}
        onPointerDown={onRailPointerDown}
        onPointerMove={onRailPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-hidden="true"
      >
        <div className="rail-track absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full" />
        <svg
          className="rail-train absolute top-0 h-3 cursor-grab active:cursor-grabbing"
          style={{ width: TRAIN_WIDTH, left: `calc(${scroll.fraction} * (100% - ${TRAIN_WIDTH}px))` }}
          viewBox="0 0 34 12"
        >
          <rect x="0" y="1" width="34" height="10" rx="3" fill="#E32017" />
          <rect x="4" y="3.5" width="5" height="4" rx="1" fill="#fff" opacity="0.9" />
          <rect x="11" y="3.5" width="5" height="4" rx="1" fill="#fff" opacity="0.9" />
          <rect x="18" y="3.5" width="5" height="4" rx="1" fill="#fff" opacity="0.9" />
          <rect x="25" y="3.5" width="5" height="4" rx="1" fill="#fff" opacity="0.9" />
          <rect x="0" y="9" width="34" height="2" rx="1" fill="#0019A8" />
        </svg>
      </div>
      <div ref={scroller} onScroll={measure} onMouseLeave={() => onHover(null)} className="strip-scroller flex w-full min-w-0 items-stretch gap-2 overflow-x-auto pt-1 pr-[calc(0.875rem+var(--safe-right))] pb-[max(1rem,calc(0.25rem+var(--safe-bottom)))] pl-[calc(0.875rem+var(--safe-left))]">
        {lines.map((line) => {
          const p = progressByLine[line.id];
          const colour = TFL_COLOURS[line.tfl];
          return (
            <div
              key={line.id}
              title={`${line.phase} · ${line.name}`}
              onMouseEnter={() => onHover(line.id)}
              onClick={() => { onPick(line.id); setOpen(false); }}
              className={cx("flex min-w-[176px] flex-none cursor-pointer flex-col justify-end gap-1.5 rounded-md px-3 pt-1.5 pb-1.5 transition hover:bg-tint", focusLineId === line.id && "bg-tint")}
            >
              <div className="whitespace-nowrap text-[11px] text-ink-soft"><b className="font-normal text-ink">{line.phase}</b> {line.short}</div>
              <div className="journey-bar relative h-2.5 overflow-hidden rounded-full bg-bar" style={{ "--tick": `${(100 / line.stations.length).toFixed(2)}%` } as React.CSSProperties}>
                <div className="h-full transition-[width] duration-700" style={{ width: `${(100 * (p.read + p.reading * 0.5)) / p.total}%`, background: colour }} />
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
