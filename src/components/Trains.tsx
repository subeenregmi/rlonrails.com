"use client";

import { memo, useEffect, useRef } from "react";
import { CURRICULUM } from "@/lib/curriculum";
import type { MapLayout } from "@/lib/geometry";
import type { Interval } from "@/lib/progress";
import type { View } from "./Minimap";
import type { CameraListener } from "./TubeMap";

interface TrainsProps {
  layout: MapLayout;
  intervals: Record<string, Interval[]>;
  count: number;
  focusLineId: string | null;
  subscribe: (listener: CameraListener) => () => void;
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
}

interface Route {
  intervals: Interval[];
  wraps: boolean;
  length: number;
  stations: number[];
}

interface CarParts {
  el: SVGGElement;
  inner: SVGGElement;
  body: SVGElement;
  band: SVGElement;
  windows: SVGElement[];
  headLamp: SVGElement;
  tailLamp: SVGElement;
}

interface TrainParts {
  visible: boolean;
  livery: string | null;
  dim: string | null;
  cars: CarParts[];
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
const MAX_CARS = 5;
const CAR_WEIGHTS = [0, 0, 2, 4, 4, 2];
const BRAKE_DISTANCE = 90;
const LAUNCH_DISTANCE = 130;
const CREEP = 0.14;
const CULL_MARGIN = 60;

const trainLength = (cars: number) => cars * CAR + (cars - 1) * GAP;
const tailOffset = (cars: number) => trainLength(cars) - HALF_CAR;

const pickCars = () => {
  const total = CAR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let n = 0; n < CAR_WEIGHTS.length; n++) { r -= CAR_WEIGHTS[n]; if (r < 0) return n; }
  return 3;
};

const shuffled = <T,>(list: T[]) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

function buildRoute(lineId: string, list: Interval[], layout: MapLayout): Route | null {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [a, b] of sorted) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 0.5) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  if (!merged.length) return null;
  const line = CURRICULUM.lines.find((l) => l.id === lineId)!;
  const length = layout.lines[lineId].length;
  const wraps = Boolean(line.closed) && merged[0][0] <= 0.5 && merged[merged.length - 1][1] >= length - 0.5;
  const stations = line.stations.map((s) => layout.stations[s.id].pos).sort((a, b) => a - b);
  return { intervals: merged, wraps, length, stations };
}

const containing = (route: Route, s: number) => route.intervals.find(([a, b]) => s >= a - 0.01 && s <= b + 0.01) ?? null;

function nearest(route: Route, s: number): Interval {
  let best = route.intervals[0];
  let bestDist = Infinity;
  for (const iv of route.intervals) {
    const d = s < iv[0] ? iv[0] - s : s > iv[1] ? s - iv[1] : 0;
    if (d < bestDist) { best = iv; bestDist = d; }
  }
  return best;
}

function nextStation(route: Route, s: number, dir: 1 | -1, limit: number, exclude: number | null): number | null {
  const ahead = route.stations.filter(
    (p) => p !== exclude && (dir > 0 ? p > s + 1 && p < limit - 0.01 : p < s - 1 && p > limit + 0.01),
  );
  if (!ahead.length) return null;
  return dir > 0 ? Math.min(...ahead) : Math.max(...ahead);
}

const easeStop = (remaining: number, cars: number) => Math.min(1, Math.max(CREEP, Math.sqrt(Math.max(0, remaining) / (BRAKE_DISTANCE + trainLength(cars)))));
const easeLaunch = (travelled: number) => Math.min(1, Math.max(CREEP, Math.sqrt(Math.max(0, travelled) / LAUNCH_DISTANCE)));
const wrapPos = (route: Route, s: number) => (route.wraps ? ((s % route.length) + route.length) % route.length : Math.min(Math.max(s, 0), route.length));

const partsCache = new WeakMap<SVGGElement, TrainParts>();

function partsOf(group: SVGGElement): TrainParts {
  let parts = partsCache.get(group);
  if (parts) return parts;
  const cars = [...group.querySelectorAll<SVGGElement>(".car")].map((el) => {
    const lamps = el.querySelectorAll<SVGElement>(".car-lamp");
    return {
      el,
      inner: el.firstElementChild as SVGGElement,
      body: el.querySelector<SVGElement>(".car-body")!,
      band: el.querySelector<SVGElement>(".car-band")!,
      windows: [...el.querySelectorAll<SVGElement>(".car-window")],
      headLamp: lamps[0],
      tailLamp: lamps[1],
    };
  });
  parts = { visible: false, livery: null, dim: null, cars };
  partsCache.set(group, parts);
  return parts;
}

const show = (el: SVGElement, visible: boolean) => {
  const value = visible ? "visible" : "hidden";
  if (el.getAttribute("visibility") !== value) el.setAttribute("visibility", value);
};

function showTrain(group: SVGGElement, parts: TrainParts, visible: boolean) {
  if (parts.visible === visible) return;
  parts.visible = visible;
  group.setAttribute("visibility", visible ? "visible" : "hidden");
}

function dimTrain(group: SVGGElement, parts: TrainParts, dim: string | null) {
  if (parts.dim === dim) return;
  parts.dim = dim;
  if (dim === null) group.removeAttribute("data-dim");
  else group.setAttribute("data-dim", dim);
}

function paintCars(parts: TrainParts, livery: Livery) {
  if (parts.livery === livery.name) return;
  parts.livery = livery.name;
  for (const car of parts.cars) {
    car.body.setAttribute("fill", livery.body);
    car.body.setAttribute("stroke", livery.edge);
    car.band.setAttribute("fill", livery.band);
    for (const w of car.windows) w.setAttribute("fill", livery.windows);
  }
}

const inView = (view: View | null, x: number, y: number, margin: number) =>
  !view || (x >= view.x - margin && x <= view.x + view.w + margin && y >= view.y - margin && y <= view.y + view.h + margin);

export const Trains = memo(function Trains({ layout, intervals, count, focusLineId, subscribe }: TrainsProps) {
  const groupRefs = useRef<Array<SVGGElement | null>>([]);
  const trainsRef = useRef<Train[]>([]);
  const routesRef = useRef<Record<string, Route>>({});
  const liveriesRef = useRef<Livery[]>([]);
  const liveryIndex = useRef(0);
  const viewRef = useRef<View | null>(null);
  const focusRef = useRef<string | null>(null);

  useEffect(() => subscribe((view) => { viewRef.current = view; }), [subscribe]);
  useEffect(() => { focusRef.current = focusLineId; }, [focusLineId]);

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
    const kept = trainsRef.current.filter((t) => routes[t.lineId]).slice(0, lineIds.length ? count : 0);
    kept.forEach((t) => {
      assigned[t.lineId]++;
      if (t.phase === "approach" || t.target === null) return;
      const iv = containing(routes[t.lineId], t.s);
      const onRoute = iv !== null && t.target.pos >= iv[0] - 0.01 && t.target.pos <= iv[1] + 0.01;
      if (!onRoute) t.target = null;
    });
    const pickLine = () => lineIds.reduce((best, id) => (assigned[id] / weights[id] < assigned[best] / weights[best] ? id : best), lineIds[0]);
    const nextLivery = () => {
      if (liveryIndex.current % LIVERIES.length === 0) liveriesRef.current = shuffled(LIVERIES);
      return liveriesRef.current[liveryIndex.current++ % LIVERIES.length];
    };
    while (kept.length < count && lineIds.length) {
      const lineId = pickLine();
      assigned[lineId]++;
      const route = routes[lineId];
      const iv = route.intervals[Math.floor(Math.random() * route.intervals.length)];
      const startStation = route.stations.filter((p) => p >= iv[0] && p <= iv[1]);
      const from = startStation.length ? startStation[Math.floor(Math.random() * startStation.length)] : iv[0];
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
      });
    }
    trainsRef.current = kept;
  }, [intervals, count, layout]);

  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const view = viewRef.current;
      const focus = focusRef.current;
      trainsRef.current.forEach((train, i) => {
        const el = groupRefs.current[i];
        const route = routesRef.current[train.lineId];
        const line = layout.lines[train.lineId];
        if (!el) return;
        const parts = partsOf(el);
        dimTrain(el, parts, focus ? String(train.lineId !== focus) : null);
        if (!route || !line) { showTrain(el, parts, false); return; }
        const tail = tailOffset(train.cars);

        if (train.phase === "dwell") {
          train.dwell -= dt;
          if (train.dwell <= 0) {
            if (train.reverseAfterStop) train.dir = train.dir > 0 ? -1 : 1;
            train.phase = "depart";
            train.departAt = train.lastStop!;
            train.s = train.departAt - train.dir * HALF_CAR;
            train.stopAt = null;
            train.target = null;
          }
          showTrain(el, parts, false);
          return;
        }

        if (train.phase === "depart") {
          const travelled = (train.s - train.departAt) * train.dir + HALF_CAR;
          train.s += train.dir * train.speed * easeLaunch(travelled) * dt;
          if (travelled >= tail + HALF_CAR) train.phase = "cruise";
        } else {
          let iv = containing(route, train.s);
          if (!iv) {
            iv = nearest(route, train.s);
            if (train.phase !== "approach") { train.s = Math.min(Math.max(train.s, iv[0]), iv[1]); train.target = null; }
          }
          const limit = train.dir > 0 ? iv[1] : iv[0];
          const wrapping = route.wraps && (train.dir > 0 ? iv[1] >= route.length - 0.5 : iv[0] <= 0.5);
          if (train.phase !== "approach" && (!train.target || (train.dir > 0 ? train.target.pos <= train.s : train.target.pos >= train.s))) {
            const pos = nextStation(route, train.s, train.dir, limit, train.lastStop);
            train.target = pos === null ? null : { pos, stop: Math.random() < train.stopChance };
          }
          const plannedStop = train.target?.stop ? train.target.pos : wrapping ? null : limit;
          const reverse = plannedStop !== null && !train.target?.stop;
          const remaining = plannedStop === null ? Infinity : (plannedStop - train.s) * train.dir + tail;
          const v = plannedStop === null ? train.speed : train.speed * easeStop(remaining, train.cars);
          const next = train.s + train.dir * v * dt;

          if (plannedStop !== null && (next - plannedStop) * train.dir >= tail) {
            train.s = plannedStop + train.dir * tail;
            train.phase = "dwell";
            train.dwell = 1 + Math.random() * 2.4;
            train.lastStop = plannedStop;
            train.reverseAfterStop = reverse;
            train.target = null;
            showTrain(el, parts, false);
            return;
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
        if (!inView(view, head.x, head.y, tail + CULL_MARGIN)) { showTrain(el, parts, false); return; }

        paintCars(parts, train.livery);
        let anyVisible = false;
        parts.cars.forEach((car, k) => {
          if (k >= train.cars) { show(car.el, false); return; }
          const raw = train.s - train.dir * k * SPACING;
          const sk = wrapPos(route, raw);
          if (!route.wraps && !containing(route, sk)) { show(car.el, false); return; }
          let visible = CAR;
          let anchor = -HALF_CAR;
          if (train.phase === "approach" && train.stopAt !== null) {
            visible = Math.min(CAR, Math.max(0, (train.stopAt - raw) * train.dir + HALF_CAR));
          } else if (train.phase === "depart") {
            visible = Math.min(CAR, Math.max(0, (raw - train.departAt) * train.dir + HALF_CAR));
            anchor = HALF_CAR;
          }
          const sx = visible / CAR;
          if (sx <= 0.01) { show(car.el, false); return; }
          anyVisible = true;
          const p = line.pointAt(sk);
          const t = line.tangentAt(sk);
          const angle = (Math.atan2(t.y, t.x) * 180) / Math.PI + (train.dir < 0 ? 180 : 0);
          show(car.el, true);
          car.el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
          car.inner.setAttribute("transform", `translate(${anchor} 0) scale(${sx.toFixed(3)} 1) translate(${-anchor} 0)`);
          show(car.headLamp, k === 0);
          show(car.tailLamp, k === train.cars - 1);
        });
        showTrain(el, parts, anyVisible);
      });
      for (let i = trainsRef.current.length; i < groupRefs.current.length; i++) {
        const el = groupRefs.current[i];
        if (el) showTrain(el, partsOf(el), false);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [layout]);

  return (
    <g className="trains">
      {Array.from({ length: count }, (_, i) => (
        <g key={i} className="train dimmable" ref={(el) => { groupRefs.current[i] = el; }} visibility="hidden">
          {Array.from({ length: MAX_CARS }, (_, k) => (
            <g key={k} className="car" visibility="hidden">
              <g>
                <rect className="car-body" x={-HALF_CAR} y={-7.5} width={CAR} height={15} rx={3.5} strokeWidth={1.2} />
                <rect className="car-band" x={-HALF_CAR + 1} y={2.2} width={CAR - 2} height={2.6} rx={1.3} />
                <rect className="car-window" x={-9.5} y={-4.6} width={4.6} height={4.2} rx={1} />
                <rect className="car-window" x={-2.3} y={-4.6} width={4.6} height={4.2} rx={1} />
                <rect className="car-window" x={4.9} y={-4.6} width={4.6} height={4.2} rx={1} />
                <circle className="car-lamp" cx={HALF_CAR - 1.4} cy={0} r={1.7} fill="#FFF3C4" />
                <circle className="car-lamp" cx={-HALF_CAR + 1.4} cy={0} r={1.3} fill="#FF4D4D" />
              </g>
            </g>
          ))}
        </g>
      ))}
    </g>
  );
});
