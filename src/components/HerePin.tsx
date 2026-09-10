"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Pt } from "@/lib/geometry";
import type { CameraListener } from "./TubeMap";
import type { View } from "./Minimap";

interface HerePinProps {
  /** The station the "YOU ARE HERE" marker sits on, in map units. */
  pt: Pt;
  colour: string;
  /** The map viewport the camera is painted into. */
  wrapRect: () => DOMRect;
  subscribe: (listener: CameraListener) => () => void;
  onClick: () => void;
}

// The marker's banner, measured off <YouAreHere> in map units: half its width,
// how far it reaches above the station, and how far below.
const MARKER_HALF_W = 70;
const MARKER_ABOVE = 82;
const MARKER_BELOW = 8;
const PIN_HALF = 22;
// The arrow reaches past the pin's circle, so it rides further in than its own
// half-width or its tip touches the edge of the map.
const PIN_REACH = 34;
// Hysteresis, so a marker parked on the edge cannot flicker the pin as the map
// drifts: it takes more of the marker to dismiss the pin than to raise it.
const RAISE_BELOW = 0.4;
const DISMISS_ABOVE = 0.6;
const MINIMAP_GAP = 10;

const overlap = (aLo: number, aHi: number, bLo: number, bHi: number) => Math.max(0, Math.min(aHi, bHi) - Math.max(aLo, bLo));

/**
 * A compass pin for the "YOU ARE HERE" marker. Panning away from the marker —
 * or hiding it behind the station panel — leaves nothing on screen to say
 * where the journey is up to, so an arrow rides the edge of the map pointing
 * at it, and clicking it flies the camera back.
 */
export function HerePin({ pt, colour, wrapRect, subscribe, onClick }: HerePinProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLButtonElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const minimapRef = useRef<HTMLElement | null>(null);
  const viewRef = useRef<View | null>(null);
  const shownRef = useRef(false);
  // Map text — and with it the banner — is drawn larger on phones.
  const textScaleRef = useRef(1);

  const place = useCallback(() => {
    const field = fieldRef.current;
    const pin = pinRef.current;
    const view = viewRef.current;
    if (!field || !pin || !view) return;
    const show = (on: boolean) => {
      shownRef.current = on;
      pin.classList.toggle("shown", on);
    };
    const box = field.getBoundingClientRect();
    const wrap = wrapRect();
    if (box.width < 2 * PIN_REACH || box.height < 2 * PIN_REACH || wrap.width < 10) { show(false); return; }
    const pixelsPerUnit = wrap.width / view.w;
    const x = wrap.left + (pt.x - view.x) * pixelsPerUnit;
    const y = wrap.top + (pt.y - view.y) * pixelsPerUnit;

    // How much of the marker the reader can actually see. Zoomed right in the
    // banner outgrows the map, so measure against whichever is smaller: a
    // banner wider than the window still counts as seen when it fills it.
    const scale = pixelsPerUnit * textScaleRef.current;
    const half = MARKER_HALF_W * scale;
    const top = y - MARKER_ABOVE * scale;
    const bottom = y + MARKER_BELOW * scale;
    const seen = overlap(x - half, x + half, box.left, box.right) * overlap(top, bottom, box.top, box.bottom);
    const marker = 2 * half * (bottom - top);
    const fraction = seen / Math.max(1, Math.min(marker, box.width * box.height));
    if (fraction >= (shownRef.current ? DISMISS_ABOVE : RAISE_BELOW)) { show(false); return; }

    // Send the pin out from the middle of the map towards the marker, and stop
    // it where that ray leaves the field.
    const midX = box.left + box.width / 2;
    const midY = box.top + box.height / 2;
    const dx = x - midX;
    const dy = y - midY || (dx ? 0 : -1);
    const reachX = box.width / 2 - PIN_REACH;
    const reachY = box.height / 2 - PIN_REACH;
    const t = Math.min(dx ? reachX / Math.abs(dx) : Infinity, dy ? reachY / Math.abs(dy) : Infinity);
    let px = midX + dx * t;
    let py = midY + dy * t;

    // The minimap owns the bottom-right corner. Step the pin off it, whichever
    // way out is shorter, rather than parking on top of it.
    const minimap = (minimapRef.current ??= document.querySelector<HTMLElement>(".mm-frame"))?.getBoundingClientRect();
    if (minimap && overlap(px - PIN_REACH, px + PIN_REACH, minimap.left - MINIMAP_GAP, minimap.right) > 0
      && overlap(py - PIN_REACH, py + PIN_REACH, minimap.top - MINIMAP_GAP, minimap.bottom) > 0) {
      const above = minimap.top - MINIMAP_GAP - PIN_REACH;
      const beside = minimap.left - MINIMAP_GAP - PIN_REACH;
      if (Math.abs(py - above) <= Math.abs(px - beside)) py = above;
      else px = beside;
      px = Math.min(Math.max(px, box.left + PIN_REACH), box.right - PIN_REACH);
      py = Math.min(Math.max(py, box.top + PIN_REACH), box.bottom - PIN_REACH);
    }

    pin.style.transform = `translate3d(${(px - box.left - PIN_HALF).toFixed(1)}px, ${(py - box.top - PIN_HALF).toFixed(1)}px, 0)`;
    if (arrowRef.current) arrowRef.current.style.transform = `rotate(${((Math.atan2(dy, dx) * 180) / Math.PI + 90).toFixed(1)}deg)`;
    show(true);
  }, [pt, wrapRect]);

  useEffect(() => subscribe((view) => { viewRef.current = view; place(); }), [subscribe, place]);

  // The panel sliding in and out narrows the field without moving the camera,
  // so the field's own size is the second thing worth watching.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new ResizeObserver(() => {
      textScaleRef.current = Number(getComputedStyle(document.documentElement).getPropertyValue("--map-text")) || 1;
      place();
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [place]);

  return (
    <div
      ref={fieldRef}
      className="here-pin-field pointer-events-none absolute z-20 top-[calc(5.5rem+var(--safe-top))] right-[calc(0.875rem+var(--safe-right))] bottom-[calc(0.875rem+var(--safe-bottom))] left-[calc(0.875rem+var(--safe-left))]"
    >
      <button
        ref={pinRef}
        type="button"
        className="here-pin"
        style={{ "--c": colour } as React.CSSProperties}
        aria-label="Go to where you are"
        title="Go to where you are"
        onClick={onClick}
      >
        <span ref={arrowRef} className="here-pin-arrow" aria-hidden="true">
          <svg viewBox="-36 -36 72 72">
            <path d="M 0 -32 L 7 -21 L -7 -21 Z" />
          </svg>
        </span>
        <span className="here-pin-face" aria-hidden="true">
          <span className="here-pin-dot" />
        </span>
      </button>
    </div>
  );
}
