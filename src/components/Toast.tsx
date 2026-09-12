"use client";

import { useState } from "react";
import type { Line } from "@/lib/curriculum";
import { cx } from "@/lib/cx";
import { TFL_COLOURS, textOn } from "@/lib/tfl";

export interface ToastMessage {
  key: number;
  line: Line;
  /** "route" when the stops your route asks for are done, "explored" when every station is read. */
  kind: "route" | "explored";
  remaining: number;
}

interface Shown {
  toast: ToastMessage;
  leaving: boolean;
}

const SPARKS = 30;

export function Toast({ toast }: { toast: ToastMessage | null }) {
  const [shown, setShown] = useState<Shown | null>(toast ? { toast, leaving: false } : null);
  if (toast && toast !== shown?.toast) setShown({ toast, leaving: false });
  else if (!toast && shown && !shown.leaving) setShown({ toast: shown.toast, leaving: true });
  if (!shown) return null;
  const { line, kind, remaining } = shown.toast;
  const explored = kind === "explored";
  const colour = TFL_COLOURS[line.tfl];
  const palette = [colour, "#FFD300", "#fff", "#E32017", "#0098D4"];
  return (
    <div
      key={shown.toast.key}
      className={cx(
        "fixed bottom-[calc(100px+var(--safe-bottom))] left-1/2 z-20 w-max max-w-[calc(100vw-2rem-var(--safe-left)-var(--safe-right))] rounded-2xl border-[3px] border-white/85 px-5.5 py-3.5 text-[15px] shadow-[0_14px_40px_rgba(0,0,0,.25),0_0_0_1px_rgba(0,0,0,.08)]",
        shown.leaving ? "toast-exit" : "toast-enter",
      )}
      style={{ background: colour, color: textOn(line.tfl) }}
      onAnimationEnd={(event) => {
        if (shown.leaving && event.target === event.currentTarget) setShown(null);
      }}
    >
      {line.name} {explored ? "line complete" : "route complete"}
      <small className="mt-0.5 block text-[12px] opacity-85">
        {explored
          ? `${line.phase} · Every station read and every lamp lit.`
          : `${line.phase} · Every stop your route asks for. ${remaining} more to explore.`}
      </small>
      {explored &&
        Array.from({ length: SPARKS }, (_, i) => {
          const angle = (Math.PI * 2 * i) / SPARKS + ((i * 7919) % 40) / 100;
          const radius = 130 + ((i * 104_729) % 170);
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: sparks are a fixed set identified only by position
              key={i}
              className="spark"
              style={
                {
                  background: palette[i % palette.length],
                  "--dx": `${Math.cos(angle) * radius}px`,
                  "--dy": `${Math.sin(angle) * radius}px`,
                  animationDelay: `${(i * 37) % 120}ms`,
                } as React.CSSProperties
              }
            />
          );
        })}
    </div>
  );
}
