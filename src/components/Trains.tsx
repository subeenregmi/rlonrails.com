"use client";

import { memo, useEffect, useRef } from "react";
import { CURRICULUM } from "@/lib/curriculum";
import type { MapLayout } from "@/lib/geometry";
import type { Interval } from "@/lib/progress";
import type { View } from "./Minimap";
import type { CameraListener } from "./TubeMap";

/*
 * The trains are drawn on a canvas laid over the map rather than as SVG
 * elements inside it. Anything that moves inside the map SVG makes the browser
 * lay out, re-record and re-rasterise the whole map — thousands of paths and
 * stroked labels, at 2.2x the viewport, every frame. A viewport-sized canvas
 * redrawn from the camera view costs the same few dozen rounded rectangles per
 * frame whatever the map looks like, and never touches the DOM.
 */

interface TrainsProps {
  layout: MapLayout;
  intervals: Record<string, Interval[]>;
  count: number;
  focusLineId: string | null;
  subscribe: (listener: CameraListener) => () => void;
  /** Water the trains disappear under, as an SVG path in map units. */
  river: string;
  /** How long after mounting the trains fade in; the intro's line drawing runs first. */
  revealAfterMs: number;
}

type Phase = "cruise" | "approach" | "dwell" | "depart";

interface Livery {
  name: string;
  body: string;
  band: string;
  windows: string;
  edge: string;
}

interface Train {
  lineId: string;
  s: number;
  dir: 1 | -1;
  speed: number;
  cars: number;
  stopChance: number;
  livery: Livery;
  phase: Phase;
  dwell: number;
  stopAt: number | null;
  departAt: number;
  reverseAfterStop: boolean;
  lastStop: number | null;
  target: { pos: number; stop: boolean } | null;
  /** Current dimming, eased towards 1 (on the focused line or no focus) or DIM. */
  alpha: number;
}

interface Route {
  intervals: Interval[];
  wraps: boolean;
  length: number;
  stations: number[];
}

const LIVERIES: Livery[] = [
  { name: "LNER", body: "#CE0E2D", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Avanti West Coast", body: "#F4F4F2", band: "#00A65E", windows: "#1F2A37", edge: "#8B9096" },
  { name: "GWR", body: "#0A4B3B", band: "#3C8D5A", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "ScotRail", body: "#0B4EA2", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "CrossCountry", body: "#7C1D3F", band: "#C8CCD0", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Northern", body: "#2C2A6B", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "TransPennine Express", body: "#0C3C78", band: "#7D3F98", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Elizabeth line", body: "#6950A1", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Thameslink", body: "#F4F4F2", band: "#E5007E", windows: "#1F2A37", edge: "#8B9096" },
  { name: "Southern", body: "#3FA535", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "East Midlands Railway", body: "#4A2C7C", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Greater Anglia", body: "#D52B1E", band: "#D9D9D9", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Merseyrail", body: "#FFD100", band: "#3A3A3A", windows: "#1F2A37", edge: "#8B9096" },
  { name: "London Overground", body: "#EF7B10", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "c2c", body: "#5C2D91", band: "#FFFFFF", windows: "#FFFFFF", edge: "#FFFFFF" },
  { name: "Chiltern Railways", body: "#F4F4F2", band: "#0B3D91", windows: "#1F2A37", edge: "#8B9096" },
  { name: "London Underground", body: "#F4F4F2", band: "#E32017", windows: "#1F2A37", edge: "#8B9096" },
];

const CAR = 26;
const HALF_CAR = CAR / 2;
const GAP = 3;
const SPACING = CAR + GAP;
const CAR_WEIGHTS = [0, 0, 2, 4, 4, 2];
const BRAKE_DISTANCE = 90;
const LAUNCH_DISTANCE = 130;
const CREEP = 0.14;
const CULL_MARGIN = 60;
const DIM = 0.12;
const DIM_SECONDS = 0.35;
const REVEAL_MS = 600;
const MAX_DPR = 2;
const VISIBILITY_CHECK_FRAMES = 30;
const HEAD_LAMP = "#FFF3C4";
const TAIL_LAMP = "#FF4D4D";

const trainLength = (cars: number) => cars * CAR + (cars - 1) * GAP;
const tailOffset = (cars: number) => trainLength(cars) - HALF_CAR;

const pickCars = () => {
  const total = CAR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let n = 0; n < CAR_WEIGHTS.length; n++) {
    r -= CAR_WEIGHTS[n];
    if (r < 0) return n;
  }
  return 3;
};

const shuffled = <T,>(list: T[]) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

function buildRoute(lineId: string, list: Interval[], layout: MapLayout): Route | null {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [a, b] of sorted) {
    const last = merged.at(-1);
    if (last && a <= last[1] + 0.5) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const lastInterval = merged.at(-1);
  if (!lastInterval) return null;
  const line = CURRICULUM.lines.find((l) => l.id === lineId);
  if (!line) throw new Error(`${lineId}: not in the curriculum`);
  const length = layout.lines[lineId].length;
  const wraps = Boolean(line.closed) && merged[0][0] <= 0.5 && lastInterval[1] >= length - 0.5;
  const stations = line.stations.map((s) => layout.stations[s.id].pos).sort((a, b) => a - b);
  return { intervals: merged, wraps, length, stations };
}

const containing = (route: Route, s: number) =>
  route.intervals.find(([a, b]) => s >= a - 0.01 && s <= b + 0.01) ?? null;

function nearest(route: Route, s: number): Interval {
  let best = route.intervals[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const iv of route.intervals) {
    const d = s < iv[0] ? iv[0] - s : s > iv[1] ? s - iv[1] : 0;
    if (d < bestDist) {
      best = iv;
      bestDist = d;
    }
  }
  return best;
}

function nextStation(route: Route, s: number, dir: 1 | -1, limit: number, exclude: number | null): number | null {
  const ahead = route.stations.filter(
    (p) => p !== exclude && (dir > 0 ? p > s + 1 && p < limit - 0.01 : p < s - 1 && p > limit + 0.01),
  );
  if (ahead.length === 0) return null;
  return dir > 0 ? Math.min(...ahead) : Math.max(...ahead);
}

const easeStop = (remaining: number, cars: number) =>
  Math.min(1, Math.max(CREEP, Math.sqrt(Math.max(0, remaining) / (BRAKE_DISTANCE + trainLength(cars)))));
const easeLaunch = (travelled: number) =>
  Math.min(1, Math.max(CREEP, Math.sqrt(Math.max(0, travelled) / LAUNCH_DISTANCE)));
const wrapPos = (route: Route, s: number) =>
  route.wraps ? ((s % route.length) + route.length) % route.length : Math.min(Math.max(s, 0), route.length);

const inView = (view: View | null, x: number, y: number, margin: number) =>
  !view ||
  (x >= view.x - margin && x <= view.x + view.w + margin && y >= view.y - margin && y <= view.y + view.h + margin);

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** One carriage in its own frame: x along the track, the body centred on the origin. */
function drawCar(ctx: CanvasRenderingContext2D, livery: Livery, head: boolean, tail: boolean) {
  roundRect(ctx, -HALF_CAR, -7.5, CAR, 15, 3.5);
  ctx.fillStyle = livery.body;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = livery.edge;
  ctx.stroke();
  roundRect(ctx, -HALF_CAR + 1, 2.2, CAR - 2, 2.6, 1.3);
  ctx.fillStyle = livery.band;
  ctx.fill();
  ctx.fillStyle = livery.windows;
  for (const wx of [-9.5, -2.3, 4.9]) {
    roundRect(ctx, wx, -4.6, 4.6, 4.2, 1);
    ctx.fill();
  }
  if (head) {
    ctx.beginPath();
    ctx.arc(HALF_CAR - 1.4, 0, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = HEAD_LAMP;
    ctx.fill();
  }
  if (tail) {
    ctx.beginPath();
    ctx.arc(-HALF_CAR + 1.4, 0, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = TAIL_LAMP;
    ctx.fill();
  }
}

const reducedMotion = () => globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Trains = memo(function TrainsCanvas({
  layout,
  intervals,
  count,
  focusLineId,
  subscribe,
  river,
  revealAfterMs,
}: TrainsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trainsRef = useRef<Train[]>([]);
  const routesRef = useRef<Record<string, Route>>({});
  const liveriesRef = useRef<Livery[]>([]);
  const liveryIndex = useRef(0);
  const viewRef = useRef<View | null>(null);
  const focusRef = useRef<string | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const revealRef = useRef(revealAfterMs);

  useEffect(
    () =>
      subscribe((view) => {
        viewRef.current = view;
      }),
    [subscribe],
  );
  useEffect(() => {
    focusRef.current = focusLineId;
  }, [focusLineId]);

  useEffect(() => {
    const routes: Record<string, Route> = {};
    const weights: Record<string, number> = {};
    for (const [lineId, list] of Object.entries(intervals)) {
      const route = buildRoute(lineId, list, layout);
      if (!route) continue;
      routes[lineId] = route;
      weights[lineId] = route.intervals.reduce((n, [a, b]) => n + (b - a), 0);
    }
    routesRef.current = routes;
    const lineIds = Object.keys(routes);
    const assigned: Record<string, number> = Object.fromEntries(lineIds.map((id) => [id, 0]));
    const kept = trainsRef.current.filter((t) => routes[t.lineId]).slice(0, lineIds.length > 0 ? count : 0);
    for (const t of kept) {
      assigned[t.lineId]++;
      if (t.phase === "approach" || t.target === null) continue;
      const iv = containing(routes[t.lineId], t.s);
      const onRoute = iv !== null && t.target.pos >= iv[0] - 0.01 && t.target.pos <= iv[1] + 0.01;
      if (!onRoute) t.target = null;
    }
    const pickLine = () =>
      lineIds.reduce(
        (best, id) => (assigned[id] / weights[id] < assigned[best] / weights[best] ? id : best),
        lineIds[0],
      );
    const nextLivery = () => {
      if (liveryIndex.current % LIVERIES.length === 0) liveriesRef.current = shuffled(LIVERIES);
      return liveriesRef.current[liveryIndex.current++ % LIVERIES.length];
    };
    while (kept.length < count && lineIds.length > 0) {
      const lineId = pickLine();
      assigned[lineId]++;
      const route = routes[lineId];
      const iv = route.intervals[Math.floor(Math.random() * route.intervals.length)];
      const startStation = route.stations.filter((p) => p >= iv[0] && p <= iv[1]);
      const from = startStation.length > 0 ? startStation[Math.floor(Math.random() * startStation.length)] : iv[0];
      const dir: 1 | -1 = from >= iv[1] - 0.5 ? -1 : from <= iv[0] + 0.5 ? 1 : Math.random() < 0.5 ? 1 : -1;
      kept.push({
        lineId,
        s: from - dir * HALF_CAR,
        dir,
        speed: 62 + Math.random() * 38,
        cars: pickCars(),
        stopChance: 0.45 + Math.random() * 0.4,
        livery: nextLivery(),
        phase: "dwell",
        dwell: 0.4 + Math.random() * 4,
        stopAt: null,
        departAt: from,
        reverseAfterStop: false,
        lastStop: from,
        target: null,
        alpha: 1,
      });
    }
    trainsRef.current = kept;
  }, [intervals, count, layout]);

  // Keep the bitmap the size of the canvas box, at a capped pixel ratio: the
  // carriages are a few pixels tall, and a 3x bitmap costs more to clear than
  // it adds.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const water = river ? new Path2D(river) : null;
    const revealAt = performance.now() + (reducedMotion() ? 0 : revealRef.current);
    let last = performance.now();
    let frame = 0;
    let frames = 0;
    let shown = true;
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // The map is hidden under the station panel on phones; there is nothing
      // to draw and no point moving the trains underneath it.
      if (frames++ % VISIBILITY_CHECK_FRAMES === 0) shown = getComputedStyle(canvas).visibility !== "hidden";
      if (!shown) return;
      const view = viewRef.current;
      const focus = focusRef.current;
      const { w, dpr } = sizeRef.current;
      if (!view || w === 0) return;
      const reveal = Math.min(1, Math.max(0, (now - revealAt) / REVEAL_MS));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (reveal === 0) return;
      // Map units to canvas pixels, then everything below is in map units.
      const k = (w / view.w) * dpr;
      ctx.setTransform(k, 0, 0, k, -view.x * k, -view.y * k);
      ctx.save();
      if (water) {
        const clip = new Path2D();
        clip.rect(
          view.x - CULL_MARGIN * 4,
          view.y - CULL_MARGIN * 4,
          view.w + CULL_MARGIN * 8,
          view.h + CULL_MARGIN * 8,
        );
        clip.addPath(water);
        ctx.clip(clip, "evenodd");
      }

      for (const train of trainsRef.current) {
        const route = routesRef.current[train.lineId];
        const line = layout.lines[train.lineId];
        if (!route || !line) continue;
        const wanted = focus && train.lineId !== focus ? DIM : 1;
        const rate = Math.min(1, dt / DIM_SECONDS);
        train.alpha += (wanted - train.alpha) * rate;
        if (Math.abs(train.alpha - wanted) < 0.005) train.alpha = wanted;
        const tail = tailOffset(train.cars);

        if (train.phase === "dwell") {
          train.dwell -= dt;
          if (train.dwell <= 0) {
            if (train.reverseAfterStop) train.dir = train.dir > 0 ? -1 : 1;
            train.phase = "depart";
            train.departAt = train.lastStop ?? 0;
            train.s = train.departAt - train.dir * HALF_CAR;
            train.stopAt = null;
            train.target = null;
          }
          continue;
        }

        if (train.phase === "depart") {
          const travelled = (train.s - train.departAt) * train.dir + HALF_CAR;
          train.s += train.dir * train.speed * easeLaunch(travelled) * dt;
          if (travelled >= tail + HALF_CAR) train.phase = "cruise";
        } else {
          let iv = containing(route, train.s);
          if (!iv) {
            iv = nearest(route, train.s);
            if (train.phase !== "approach") {
              train.s = Math.min(Math.max(train.s, iv[0]), iv[1]);
              train.target = null;
            }
          }
          const limit = train.dir > 0 ? iv[1] : iv[0];
          const wrapping = route.wraps && (train.dir > 0 ? iv[1] >= route.length - 0.5 : iv[0] <= 0.5);
          if (
            train.phase !== "approach" &&
            (!train.target || (train.dir > 0 ? train.target.pos <= train.s : train.target.pos >= train.s))
          ) {
            const pos = nextStation(route, train.s, train.dir, limit, train.lastStop);
            train.target = pos === null ? null : { pos, stop: Math.random() < train.stopChance };
          }
          const plannedStop = train.target?.stop ? train.target.pos : wrapping ? null : limit;
          const reverse = plannedStop !== null && !train.target?.stop;
          const remaining =
            plannedStop === null ? Number.POSITIVE_INFINITY : (plannedStop - train.s) * train.dir + tail;
          const v = plannedStop === null ? train.speed : train.speed * easeStop(remaining, train.cars);
          const next = train.s + train.dir * v * dt;

          if (plannedStop !== null && (next - plannedStop) * train.dir >= tail) {
            train.s = plannedStop + train.dir * tail;
            train.phase = "dwell";
            train.dwell = 1 + Math.random() * 2.4;
            train.lastStop = plannedStop;
            train.reverseAfterStop = reverse;
            train.target = null;
            continue;
          }
          if (wrapping && plannedStop === null && (train.dir > 0 ? next >= iv[1] : next <= iv[0])) {
            train.s = train.dir > 0 ? next - route.length : next + route.length;
            train.target = null;
            train.lastStop = null;
          } else {
            train.s = next;
          }
          if (plannedStop !== null && (train.s - plannedStop) * train.dir > -HALF_CAR) {
            train.phase = "approach";
            train.stopAt = plannedStop;
          } else {
            train.phase = "cruise";
            train.stopAt = null;
          }
        }

        const head = line.pointAt(wrapPos(route, train.s));
        if (!inView(view, head.x, head.y, tail + CULL_MARGIN)) continue;

        ctx.globalAlpha = reveal * train.alpha;
        for (let c = 0; c < train.cars; c++) {
          const raw = train.s - train.dir * c * SPACING;
          const sk = wrapPos(route, raw);
          if (!route.wraps && !containing(route, sk)) continue;
          let visible = CAR;
          let anchor = -HALF_CAR;
          if (train.phase === "approach" && train.stopAt !== null) {
            visible = Math.min(CAR, Math.max(0, (train.stopAt - raw) * train.dir + HALF_CAR));
          } else if (train.phase === "depart") {
            visible = Math.min(CAR, Math.max(0, (raw - train.departAt) * train.dir + HALF_CAR));
            anchor = HALF_CAR;
          }
          const sx = visible / CAR;
          if (sx <= 0.01) continue;
          const p = line.pointAt(sk);
          const t = line.tangentAt(sk);
          const angle = Math.atan2(t.y, t.x) + (train.dir < 0 ? Math.PI : 0);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          // Carriages slide out of a station as they leave and into one as they
          // arrive: squash along the track about the platform end.
          ctx.translate(anchor, 0);
          ctx.scale(sx, 1);
          ctx.translate(-anchor, 0);
          drawCar(ctx, train.livery, c === 0, c === train.cars - 1);
          ctx.restore();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [layout, river]);

  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabIndex is not focusable
    <canvas
      ref={canvasRef}
      className="trains-canvas pointer-events-none absolute inset-0 size-full"
      aria-hidden="true"
    />
  );
});
