"use client";

import type { Line } from "@/lib/curriculum";
import { TFL_COLOURS, textOn } from "@/lib/tfl";

export interface ToastMessage {
  key: number;
  line: Line;
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  const colour = TFL_COLOURS[toast.line.tfl];
  const palette = [colour, "#FFD300", "#fff", "#E32017", "#0098D4"];
  return (
    <div
      key={toast.key}
      className="toast-enter fixed bottom-[calc(100px+env(safe-area-inset-bottom))] left-1/2 z-20 w-max max-w-[calc(100vw-2rem)] rounded-2xl px-5.5 py-3.5 text-[15px] shadow-[0_14px_40px_rgba(0,0,0,.25)]"
      style={{ background: colour, color: textOn(toast.line.tfl) }}
    >
      {toast.line.name} line complete
      <small className="mt-0.5 block text-[12px] opacity-85">{toast.line.phase} · every station read and every lamp lit.</small>
      {Array.from({ length: 26 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 26 + ((i * 7919) % 40) / 100;
        const radius = 90 + ((i * 104729) % 120);
        return (
          <span
            key={i}
            className="spark"
            style={{
              background: palette[i % palette.length],
              "--dx": `${Math.cos(angle) * radius}px`,
              "--dy": `${Math.sin(angle) * radius}px`,
              animationDelay: `${(i * 37) % 120}ms`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
