"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";

export interface DialogMessage {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
}

export function Dialog({ dialog, onClose }: { dialog: DialogMessage | null; onClose: () => void }) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    primaryRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, onClose]);

  if (!dialog) return null;
  const confirm = () => { dialog.onConfirm?.(); onClose(); };

  return (
    <div className="dialog-backdrop fixed inset-0 z-30 flex items-center justify-center bg-ink/40 pt-[calc(1.5rem+var(--safe-top))] pr-[calc(1.5rem+var(--safe-right))] pb-[calc(1.5rem+var(--safe-bottom))] pl-[calc(1.5rem+var(--safe-left))]" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="dialog-enter w-[400px] max-w-full overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_70px_rgba(0,0,0,.32)]">
        <header className="bg-tfl-blue px-5 pt-4 pb-4 text-white shadow-[inset_0_-3px_0_#E32017]">
          <div className="text-[11px] uppercase tracking-[0.1em] opacity-80">RL on Rails</div>
          <h2 id="dialog-title" className="mt-1 text-[19px] leading-tight">{dialog.title}</h2>
        </header>
        <p className="px-5 pt-4 text-[13.5px] leading-snug text-ink-soft">{dialog.body}</p>
        <div className="flex justify-end gap-2 px-5 pt-5 pb-5">
          {dialog.onConfirm && (
            <button type="button" onClick={onClose} className="rounded-full bg-tint px-4 py-2 text-[13px] transition hover:bg-tint-strong">Cancel</button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={confirm}
            className={cx("rounded-full px-4 py-2 text-[13px] text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", dialog.danger ? "bg-tfl-red focus-visible:ring-tfl-red" : "bg-tfl-blue focus-visible:ring-tfl-blue")}
          >
            {dialog.confirmLabel ?? "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
