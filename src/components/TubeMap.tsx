"use client";

import {
  memo,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { CURRICULUM, type Line, MAP_BOUNDS, type PillPoint, START_VIEW, type Station, ZONES } from "@/lib/curriculum";
import { cx } from "@/lib/cx";
import {
  coastRings,
  coastWaves,
  INTERCHANGE_RADIUS,
  type IntroSchedule,
  type LineLayout,
  lineBounds,
  type MapLayout,
  type Pt,
  RIVER,
  riverCrossings,
  STATION_RADIUS,
  type Surface,
  surfaceGeometry,
  terminusPoint,
} from "@/lib/geometry";
import { dashArray, type Interval, isRead, type Progress, type Status, statusOf } from "@/lib/progress";
import { isLightLine } from "@/lib/tfl";
import { HerePin } from "./HerePin";
import { Minimap, type View } from "./Minimap";
import { Trains } from "./Trains";

export interface TubeMapHandle {
  flyToStation: (id: string) => void;
  flyToLine: (id: string) => void;
  fitAll: () => void;
  zoomBy: (factor: number) => void;
}

interface TubeMapProps {
  ref?: Ref<TubeMapHandle>;
  layout: MapLayout;
  schedule: IntroSchedule;
  hereId: string | null;
  nextIds: Record<string, string | null>;
  completeIds: Set<string>;
  progress: Progress;
  colours: Record<string, string>;
  selectedId: string | null;
  focusLineId: string | null;
  trainCount: number;
  /** Mask the coloured tracks while the intro draws them in. */
  intro: boolean;
  /** Touch devices skip the drawn intro: shorter opening flight, trains appear sooner. */
  lite: boolean;
  /** The side panel, which covers the right of the map while it is open. */
  panelRef: RefObject<HTMLElement | null>;
  panelOpen: boolean;
  onSelect: (id: string | null) => void;
  onPinLine: (id: string | null) => void;
}

const MIN_VIEW_W = 420;
const MAX_VIEW_SCALE = 1.15;
// Past this the panel is the whole screen, and there is no map beside it to keep clear.
const MAX_HIDDEN = 0.75;
const NUDGE_MARGIN = 24;
const WORLD_PAD = 40;
interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
const worldOf = (polygon: Pt[]): Bounds => {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs) - WORLD_PAD;
  const minY = Math.min(...ys) - WORLD_PAD;
  return { x: minX, y: minY, w: Math.max(...xs) + WORLD_PAD - minX, h: Math.max(...ys) + WORLD_PAD - minY };
};
const SETTLE_DELAY = 160;
const FLICK_WINDOW = 100;
const FLICK_STALE = 60;
const FLICK_MIN_SPEED = 0.08;
const GLIDE_FRICTION = 0.93;
const GLIDE_MIN_SPEED = 0.02;
const GLIDE_MAX_SPEED = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// The view may run past the world on the right by however much of it the
// panel hides, so what is seen beside the panel is still held within the world.
const clampView = (v: View, world: Bounds, hiddenW: number) => {
  const seenW = v.w - hiddenW;
  const maxX = world.x + world.w;
  const maxY = world.y + world.h;
  v.x = seenW >= world.w ? world.x + (world.w - seenW) / 2 : clamp(v.x, world.x, maxX - seenW);
  v.y = v.h >= world.h ? (world.y + maxY - v.h) / 2 : clamp(v.y, world.y, maxY - v.h);
};
// Where a view of this size is allowed to sit; null once it outgrows the world,
// which can then only be shown centred.
type Range = [number, number] | null;
const panRange = (lo: number, size: number, extent: number): Range =>
  extent >= size ? null : [lo + extent / 2, lo + size - extent / 2];
const panCentre = (centre: number, range: Range, mid: number) => (range ? clamp(centre, range[0], range[1]) : mid);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
interface Sample {
  x: number;
  y: number;
  t: number;
}
const flickVelocity = (trail: Sample[], now: number) => {
  const last = trail.at(-1);
  const first = trail[0];
  if (!last || now - last.t > FLICK_STALE) return null;
  const dt = last.t - first.t;
  if (dt < 8) return null;
  const vx = clamp((last.x - first.x) / dt, -GLIDE_MAX_SPEED, GLIDE_MAX_SPEED);
  const vy = clamp((last.y - first.y) / dt, -GLIDE_MAX_SPEED, GLIDE_MAX_SPEED);
  return Math.hypot(vx, vy) < FLICK_MIN_SPEED ? null : { vx, vy };
};
const fmt = (p: Pt) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
const segmentPath = (l: LineLayout, a: number, b: number) => {
  const steps = Math.max(2, Math.ceil((b - a) / 6));
  const pts = Array.from({ length: steps + 1 }, (_, k) => l.pointAt(a + ((b - a) * k) / steps));
  return `M ${pts.map(fmt).join(" L ")}`;
};
const spanIntervals = (anchor: number, head: number, length: number): Interval[] => {
  if (head >= anchor)
    return head <= length
      ? [[anchor, head]]
      : [
          [anchor, length],
          [0, head - length],
        ];
  return head >= 0
    ? [[head, anchor]]
    : [
        [0, anchor],
        [length + head, length],
      ];
};
const nodeBefore = (line: Line, nodes: TrackNode[], index: number): TrackNode | null =>
  nodes[index - 1] ?? (line.closed ? (nodes.at(-1) ?? null) : null);
const intervalsPath = (l: LineLayout, intervals: Interval[]) =>
  intervals.map(([a, b]) => segmentPath(l, a, b)).join(" ");
interface TrackNode {
  id: string;
  pos: number;
}
type TrackPhase = "fill" | "grow";
const trackNodes = (line: Line, layout: MapLayout): TrackNode[] => {
  const l = layout.lines[line.id];
  const nodes: TrackNode[] = line.stations.map((station) => ({ id: station.id, pos: layout.stations[station.id].pos }));
  if (line.from) nodes.unshift({ id: line.from, pos: 0 });
  const last = line.path.at(-1);
  if (typeof last === "object" && !Array.isArray(last)) nodes.push({ id: last.through, pos: l.length });
  return nodes;
};
const nodeAfter = (line: Line, nodes: TrackNode[], index: number): TrackNode | null =>
  nodes[index + 1] ?? (line.closed ? nodes[0] : null);
// Every dashed frontier flows in step. Reading the animations is deferred a
// frame: done inside React's commit it forces a synchronous style recalc of
// the whole map, once per path, while the tree is at its dirtiest.
const lockFlowPhase = (el: SVGPathElement | null) => {
  if (!el) return;
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    for (const a of el.getAnimations()) {
      if ((a as CSSAnimation).animationName === "next-flow") a.startTime = 0;
    }
  });
};
const LITE_INTRO_MS = 600;
const LITE_FLIGHT_MS = 2200;
const SVG_NS = "http://www.w3.org/2000/svg";
export type CameraListener = (view: View) => void;
const reducedMotion = () => globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lineOf = new Map<string, Line>();
for (const line of CURRICULUM.lines) for (const s of line.stations) lineOf.set(s.id, line);

function Shape({ station, className, r }: { station: Station; className: string; r: number }) {
  if (station.tag === "exercise")
    return <rect className={className} x={-r} y={-r} width={r * 2} height={r * 2} rx={3} pathLength={100} />;
  return <circle className={className} r={r} pathLength={100} />;
}

const WAVE_GROUPS = 0;
const ZONE_TINTS = ["#e9e0ec", "#dfe8ee", "#e3ecdd", "#f0e7d3"];
const WAVE_VARIANTS = 6;

const Island = memo(function IslandSvg({
  surface,
  introMs,
  clipId,
}: {
  surface: Surface;
  introMs: number;
  clipId: string;
}) {
  const pool = useMemo(
    () =>
      WAVE_GROUPS > 0
        ? coastWaves(coastRings(surface.coastPolygon, MAP_BOUNDS), WAVE_GROUPS, WAVE_VARIANTS, surface.riverPolygon)
        : [],
    [surface],
  );
  const slots = useMemo(
    () =>
      Array.from({ length: WAVE_GROUPS }, (_, slot) =>
        pool.slice(slot * WAVE_VARIANTS, slot * WAVE_VARIANTS + WAVE_VARIANTS).filter((g) => g.length),
      ),
    [pool],
  );
  const wavesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const root = wavesRef.current;
    if (!root) return;
    const swap = (event: Event) => {
      const lead = event.currentTarget as SVGPathElement;
      const slot = Number(lead.dataset.slot);
      const variants = slots[slot];
      const group = variants[Math.floor(Math.random() * variants.length)];
      if (!group) return;
      const duration = `${(group[0].duration + Math.random() * 1.5).toFixed(2)}s`;
      for (const path of root.querySelectorAll<SVGPathElement>(`.wave-mark[data-slot="${slot}"]`)) {
        const mark = group[Number(path.dataset.ring)];
        if (!mark) continue;
        path.setAttribute("d", mark.d);
        path.style.setProperty("--tx", `${mark.nx.toFixed(1)}px`);
        path.style.setProperty("--ty", `${mark.ny.toFixed(1)}px`);
        path.style.animationDuration = duration;
      }
    };
    const paths = root.querySelectorAll<SVGPathElement>('.wave-mark[data-ring="0"]');
    for (const p of paths) p.addEventListener("animationiteration", swap);
    return () => {
      for (const p of paths) p.removeEventListener("animationiteration", swap);
    };
  }, [slots]);

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={surface.island} />
        </clipPath>
      </defs>
      <g ref={wavesRef}>
        {slots.flatMap((variants, slot) =>
          (variants[0] ?? []).map((wave, ring) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: slot and ring are the identity, also written to data-slot and data-ring
              key={`${slot}-${ring}`}
              className="wave-mark"
              data-slot={slot}
              data-ring={ring}
              d={wave.d}
              style={
                {
                  "--tx": `${wave.nx.toFixed(1)}px`,
                  "--ty": `${wave.ny.toFixed(1)}px`,
                  animationDelay: `${(introMs / 1000 + 7 + wave.delay).toFixed(2)}s`,
                  animationDuration: `${wave.duration.toFixed(2)}s`,
                } as React.CSSProperties
              }
            />
          )),
        )}
      </g>
      <path className="shore" d={surface.island} />
      <path className="island-land" d={surface.island} />
      <g className="island-tint">
        <path className="zone" d={surface.island} style={{ fill: ZONE_TINTS[0] }} />
      </g>
    </g>
  );
});

const WATERMARK_MAX = 150;
const WATERMARK_CHAR = 0.62;

const Zones = memo(function ZonesSvg({ clipId }: { clipId: string }) {
  return (
    <g className="zones-layer" clipPath={`url(#${clipId})`}>
      {ZONES.map((zone, index) => {
        const inner = ZONES[index + 1];
        const label = zone.label.replace(" · ", "  ·  ").toUpperCase();
        const bandHeight = inner ? inner.y - zone.y : zone.h;
        const fontSize = Math.min(WATERMARK_MAX, bandHeight * 0.62, (zone.w - 120) / label.length / WATERMARK_CHAR);
        const labelX = zone.x + zone.w / 2;
        const labelY = inner ? (zone.y + inner.y) / 2 : zone.y + zone.h / 2;
        return (
          <g key={zone.label}>
            {index > 0 && (
              <rect
                className="zone"
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={48}
                style={{ fill: ZONE_TINTS[index % ZONE_TINTS.length] }}
              />
            )}
            <text
              className="zone-watermark"
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize.toFixed(0)}
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
});

const River = memo(function RiverSvg({
  layout,
  surface,
  colours,
}: {
  layout: MapLayout;
  surface: Surface;
  colours: Record<string, string>;
}) {
  const { portals, tunnels } = useMemo(() => riverCrossings(layout, surface.riverPolygon), [layout, surface]);
  return (
    <g className="river-layer">
      <path className="river" d={surface.river} />
      <path className="shore" d={surface.island} />
      {tunnels.map((tunnel) => (
        <g key={`${tunnel.lineId}-${tunnel.d}`}>
          <path className="tunnel-casing" d={tunnel.d} />
          <path className="tunnel" d={tunnel.d} stroke={colours[tunnel.lineId]} />
        </g>
      ))}
      {portals.map((c) => {
        const angle = (Math.atan2(c.tangent.y, c.tangent.x) * 180) / Math.PI;
        const mouthX = c.into ? 1 : -7;
        return (
          <g
            key={`${c.lineId}-${c.pt.x.toFixed(1)}-${c.pt.y.toFixed(1)}`}
            className="portal"
            transform={`translate(${c.pt.x.toFixed(1)} ${c.pt.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}
          >
            <rect className="portal-frame" x={-7} y={-12} width={14} height={24} rx={2} />
            <rect className="portal-mouth" x={mouthX} y={-7} width={6} height={14} rx={1.5} />
            <rect className="portal-keystone" x={-1} y={-12} width={2} height={24} />
          </g>
        );
      })}
    </g>
  );
});

interface LinkLayerProps {
  layout: MapLayout;
  colours: Record<string, string>;
  litKey: string;
  selectedId: string | null;
  focusLineId: string | null;
}

const LinkLayer = memo(function LinkLayerSvg({ layout, colours, litKey, selectedId, focusLineId }: LinkLayerProps) {
  return (
    <g>
      <defs>
        {CURRICULUM.links.map(([a, b], i) => {
          const A = layout.stations[a];
          const B = layout.stations[b];
          return (
            <linearGradient
              key={`${a}-${b}`}
              id={`grad-link-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={A.pt.x}
              y1={A.pt.y}
              x2={B.pt.x}
              y2={B.pt.y}
            >
              <stop offset="0" stopColor={colours[A.lineId]} />
              <stop offset="1" stopColor={colours[B.lineId]} />
            </linearGradient>
          );
        })}
      </defs>
      {CURRICULUM.links.map(([a, b], i) => {
        const A = layout.stations[a];
        const B = layout.stations[b];
        const mid = { x: (A.pt.x + B.pt.x) / 2, y: (A.pt.y + B.pt.y) / 2 };
        const dx = B.pt.x - A.pt.x;
        const dy = B.pt.y - A.pt.y;
        const dist = Math.hypot(dx, dy) || 1;
        const perp = { x: -dy / dist, y: dx / dist };
        const bulge = clamp(dist * 0.18, 30, 220) * (perp.y < 0 ? 1 : -1);
        const control = { x: mid.x + perp.x * bulge, y: mid.y + perp.y * bulge };
        const lit = litKey[i] === "1";
        const active = selectedId === a || selectedId === b;
        const focus = Boolean(focusLineId) && (A.lineId === focusLineId || B.lineId === focusLineId);
        return (
          <path
            key={`${a}-${b}`}
            className={cx("link", lit && "lit", active && "active", focus && "focus")}
            d={`M ${fmt(A.pt)} Q ${fmt(control)} ${fmt(B.pt)}`}
            style={lit ? { stroke: `url(#grad-link-${i})` } : undefined}
          />
        );
      })}
    </g>
  );
});

interface TrackProps {
  line: Line;
  layout: MapLayout;
  schedule: IntroSchedule;
  colour: string;
  dash: string;
  frontier: string;
  /** One character per terminus, "1" where its station is read. A string so the memo holds. */
  readEnds: string;
  masked: boolean;
  dim?: string;
}

const TERMINUS_HALF = 13;

const Track = memo(function TrackSvg({
  line,
  layout,
  schedule,
  colour,
  dash,
  frontier,
  readEnds,
  masked,
  dim,
}: TrackProps) {
  const l = layout.lines[line.id];
  const bounds = useMemo(() => {
    const box = {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    };
    for (let pos = 0; pos <= l.length; pos += 30) {
      const p = l.pointAt(pos);
      box.minX = Math.min(box.minX, p.x);
      box.maxX = Math.max(box.maxX, p.x);
      box.minY = Math.min(box.minY, p.y);
      box.maxY = Math.max(box.maxY, p.y);
    }
    return { minX: box.minX - 60, minY: box.minY - 60, maxX: box.maxX + 60, maxY: box.maxY + 60 };
  }, [l]);
  const drawTiming = {
    "--len": l.length.toFixed(1),
    "--delay": `${schedule.lineStart[line.id].toFixed(0)}ms`,
    "--draw": `${schedule.lineDuration[line.id].toFixed(0)}ms`,
  } as React.CSSProperties;
  const drawMask = masked ? `url(#draw-${line.id})` : undefined;
  return (
    <>
      {l.termini.map((end, i) => {
        const nx = -end.tangent.y * TERMINUS_HALF;
        const ny = end.tangent.x * TERMINUS_HALF;
        const { x: bx, y: by } = terminusPoint(end);
        const style = {
          "--delay": `${(schedule.stationDelay[end.stationId] + 200).toFixed(0)}ms`,
        } as React.CSSProperties;
        return (
          <g key={end.outward}>
            <line
              className="terminus-stub dimmable"
              data-dim={dim}
              x1={end.pt.x.toFixed(1)}
              y1={end.pt.y.toFixed(1)}
              x2={bx.toFixed(1)}
              y2={by.toFixed(1)}
              stroke={readEnds[i] === "1" ? colour : undefined}
              style={style}
            />
            <line
              className="terminus dimmable"
              data-dim={dim}
              x1={(bx - nx).toFixed(1)}
              y1={(by - ny).toFixed(1)}
              x2={(bx + nx).toFixed(1)}
              y2={(by + ny).toFixed(1)}
              stroke={readEnds[i] === "1" ? colour : undefined}
              style={style}
            />
          </g>
        );
      })}
      {masked ? (
        <defs>
          <mask
            id={`draw-${line.id}`}
            maskUnits="userSpaceOnUse"
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.maxX - bounds.minX}
            height={bounds.maxY - bounds.minY}
          >
            <path className="draw-mask" d={l.d} style={drawTiming} />
          </mask>
        </defs>
      ) : null}
      <path className="track-base dimmable" data-dim={dim} d={l.d} style={drawTiming} />
      <path
        className="track-colour dimmable"
        data-dim={dim}
        d={l.d}
        stroke={colour}
        strokeDasharray={dash}
        mask={drawMask}
      />
      {frontier ? (
        <path
          ref={lockFlowPhase}
          className="track-next dimmable"
          data-dim={dim}
          d={frontier}
          stroke={colour}
          mask={drawMask}
        />
      ) : null}
    </>
  );
});

interface LineStationsProps {
  line: Line;
  layout: MapLayout;
  schedule: IntroSchedule;
  colour: string;
  statusKey: string;
  nextId: string | null;
  hereId?: string | null;
  selectedId: string | null;
  focusIds: Set<string> | null;
  register: (id: string, el: SVGGElement | null) => void;
}
const dimStation = (focusIds: Set<string> | null, id: string) => (focusIds ? String(!focusIds.has(id)) : undefined);

const LineStations = memo(function LineStationsSvg({
  line,
  layout,
  schedule,
  colour,
  statusKey,
  nextId,
  hereId,
  selectedId,
  focusIds,
  register,
}: LineStationsProps) {
  return (
    <g>
      {line.stations.map((station, index) => {
        const s = layout.stations[station.id];
        const status = statusKey[index] as "u" | "g" | "r" | "c";
        const statusClass =
          status === "c" ? "read complete" : status === "r" ? "read" : status === "g" ? "reading" : "unread";
        const r = s.interchange ? INTERCHANGE_RADIUS : STATION_RADIUS[station.tag];
        return (
          <g
            key={station.id}
            ref={(el) => register(station.id, el)}
            className={cx(
              "station dimmable",
              station.tag,
              statusClass,
              nextId === station.id && "next",
              hereId === station.id && "here",
              selectedId === station.id && "selected",
              s.interchange && "interchange",
            )}
            data-id={station.id}
            data-dim={dimStation(focusIds, station.id)}
            transform={`translate(${s.pt.x.toFixed(1)} ${s.pt.y.toFixed(1)})`}
            style={
              {
                "--c": colour,
                "--r": `${r}px`,
                "--delay": `${schedule.stationDelay[station.id].toFixed(0)}ms`,
              } as React.CSSProperties
            }
          >
            <Shape station={station} className="halo" r={r} />
            <Shape station={station} className="core" r={r} />
            <Shape station={station} className="dot" r={r * 0.42} />
            <circle className="hit" r={r + 9} fill="transparent" />
          </g>
        );
      })}
    </g>
  );
});

const LineLabels = memo(function LineLabelsSvg({
  line,
  layout,
  schedule,
  colour,
  statusKey,
  nextId,
  selectedId,
  focusIds,
}: Omit<LineStationsProps, "register">) {
  return (
    <g>
      {line.stations.map((station, index) => {
        const s = layout.stations[station.id];
        const status = statusKey[index];
        const statusClass = status === "r" || status === "c" ? "read" : status === "g" ? "reading" : "unread";
        return (
          <text
            key={station.id}
            className={cx(
              "label dimmable",
              station.tag,
              statusClass,
              nextId === station.id && "next",
              selectedId === station.id && "selected",
            )}
            data-id={station.id}
            data-dim={dimStation(focusIds, station.id)}
            x={s.label.x.toFixed(1)}
            y={s.label.y.toFixed(1)}
            textAnchor={s.label.anchor}
            dominantBaseline={s.label.baseline}
            style={
              {
                "--c": colour,
                "--delay": `${(schedule.stationDelay[station.id] + 350).toFixed(0)}ms`,
              } as React.CSSProperties
            }
          >
            {station.name}
          </text>
        );
      })}
    </g>
  );
});

const Pill = memo(function PillSvg({
  line,
  at,
  colour,
  delay,
  dim,
}: {
  line: Line;
  at: PillPoint;
  colour: string;
  delay: number;
  dim?: string;
}) {
  const textRef = useRef<SVGTextElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const b = textRef.current?.getBBox();
      if (b) setBox({ x: b.x - 12, y: b.y - 5, w: b.width + 24, h: b.height + 10 });
    };
    measure();
    document.fonts.ready.then(measure);
  }, []);
  return (
    <g
      className={cx("pill dimmable", isLightLine(line.tfl) && "light")}
      data-line={line.id}
      data-dim={dim}
      style={{ "--c": colour, "--delay": `${delay.toFixed(0)}ms` } as React.CSSProperties}
    >
      {box ? <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={11} /> : null}
      <text ref={textRef} x={at.x} y={at.y} textAnchor={at.anchor} dominantBaseline="middle">
        {`${line.phase} · ${line.short}`.toUpperCase()}
      </text>
    </g>
  );
});

const LAMP_GAP = 34;
const BOOTH_GAP = 30;
const hasBooth = (station: Station, index: number) =>
  !station.landmark && (station.tag === "exercise" || index % 7 === 4);
const RAYS = [150, 180, 210, -30, 0, 30]
  .map((deg) => {
    const a = (deg * Math.PI) / 180;
    const long = deg % 180 === 0 ? 13 : 11;
    return `M ${(Math.cos(a) * 7).toFixed(2)} ${(Math.sin(a) * 7).toFixed(2)} L ${(Math.cos(a) * long).toFixed(2)} ${(Math.sin(a) * long).toFixed(2)}`;
  })
  .join(" ");

const LineBooths = memo(function LineBoothsSvg({
  line,
  layout,
  schedule,
  statusKey,
  focusIds,
}: Omit<LineStationsProps, "register" | "colour" | "nextId" | "selectedId">) {
  return (
    <g>
      {line.stations.map((station, index) => {
        if (!hasBooth(station, index)) return null;
        const s = layout.stations[station.id];
        const dx = s.label.x - s.pt.x;
        const dy = s.label.y - s.pt.y;
        const d = Math.hypot(dx, dy) || 1;
        const bx = s.pt.x - (dx / d) * BOOTH_GAP;
        const by = s.pt.y - (dy / d) * BOOTH_GAP + 13;
        const status = statusKey[index];
        return (
          <g
            key={station.id}
            className={cx("booth dimmable", (status === "r" || status === "c") && "lit", status === "g" && "warm")}
            data-dim={dimStation(focusIds, station.id)}
            transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}
            style={{ "--delay": `${(schedule.stationDelay[station.id] + 250).toFixed(0)}ms` } as React.CSSProperties}
          >
            <rect className="booth-shadow" x={-7} y={-1.5} width={14} height={3} rx={1.5} />
            <rect className="booth-body" x={-6} y={-23} width={12} height={23} rx={1} />
            <path className="booth-body" d="M -6.4 -23 Q 0 -29 6.4 -23 Z" />
            <rect className="booth-body" x={-1.4} y={-29.5} width={2.8} height={1.6} rx={0.6} />
            <rect className="booth-band" x={-5.2} y={-21.6} width={10.4} height={2.6} rx={0.5} />
            <rect className="booth-sign" x={-4} y={-20.9} width={8} height={1.2} rx={0.4} />
            <rect className="booth-glass" x={-4.2} y={-18} width={8.4} height={12.5} rx={0.4} />
            <path
              className="booth-bars"
              d="M -1.4 -18 V -5.5 M 1.4 -18 V -5.5 M -4.2 -15 H 4.2 M -4.2 -12 H 4.2 M -4.2 -9 H 4.2"
            />
            <rect className="booth-band" x={-4.6} y={-5} width={9.2} height={4.4} rx={0.4} />
          </g>
        );
      })}
    </g>
  );
});

const LineLamps = memo(function LineLampsSvg({
  line,
  layout,
  schedule,
  statusKey,
  focusIds,
}: Omit<LineStationsProps, "register" | "colour" | "nextId" | "selectedId">) {
  return (
    <g>
      {line.stations.map((station, index) => {
        if (!station.landmark) return null;
        const s = layout.stations[station.id];
        const dx = s.label.x - s.pt.x;
        const dy = s.label.y - s.pt.y;
        const d = Math.hypot(dx, dy) || 1;
        const lx = s.pt.x - (dx / d) * LAMP_GAP;
        const ly = s.pt.y - (dy / d) * LAMP_GAP + 16;
        const status = statusKey[index];
        return (
          <g
            key={station.id}
            className={cx("lamp dimmable", (status === "r" || status === "c") && "lit", status === "g" && "warm")}
            data-dim={dimStation(focusIds, station.id)}
            transform={`translate(${lx.toFixed(1)} ${ly.toFixed(1)})`}
            style={{ "--delay": `${(schedule.stationDelay[station.id] + 250).toFixed(0)}ms` } as React.CSSProperties}
          >
            <g className="lamp-light" transform="translate(0 -24)">
              <path className="lamp-rays lamp-rays-a" d={RAYS} />
              <path className="lamp-rays lamp-rays-b" d={RAYS} />
            </g>
            <rect className="lamp-iron" x={-3.2} y={-1.4} width={6.4} height={2.4} rx={0.8} />
            <rect className="lamp-iron" x={-1} y={-19} width={2} height={18} />
            <rect className="lamp-iron" x={-4.2} y={-14.5} width={8.4} height={1.1} rx={0.5} />
            <path className="lamp-glass" d="M -4 -19 L 4 -19 L 3 -28.5 L -3 -28.5 Z" />
            <path className="lamp-iron" d="M -4.8 -28.5 L 0 -32.5 L 4.8 -28.5 Z" />
            <circle className="lamp-iron" cx={0} cy={-33.3} r={1} />
            <circle className="lamp-flame" cx={0} cy={-24} r={1.8} />
          </g>
        );
      })}
    </g>
  );
});

const statusChar = (status: Status, complete: boolean) =>
  status === "read" ? (complete ? "c" : "r") : status === "reading" ? "g" : "u";

export function TubeMap({
  ref,
  layout,
  schedule,
  hereId,
  nextIds,
  completeIds,
  progress,
  colours,
  selectedId,
  focusLineId,
  trainCount,
  intro,
  lite,
  panelRef,
  panelOpen,
  onSelect,
  onPinLine,
}: TubeMapProps) {
  const islandClipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const animLayerRef = useRef<SVGGElement>(null);
  const stationRefs = useRef(new Map<string, SVGGElement>());
  const pending = useRef<View>({ x: MAP_BOUNDS.x, y: MAP_BOUNDS.y, w: MAP_BOUNDS.w, h: MAP_BOUNDS.h });
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paintFrame = useRef<number | null>(null);
  const flightRef = useRef<number | null>(null);
  const listeners = useRef(new Set<CameraListener>());
  const dragRef = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
    target: Element | null;
    trail: Sample[];
  } | null>(null);
  const glideRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, Pt>());
  const pinchRef = useRef<{ dist: number; mid: Pt } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const hiddenRef = useRef(0);
  const panelOpenRef = useRef(panelOpen);
  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);
  const shieldRef = useRef<HTMLDivElement>(null);
  const setDragging = useCallback((on: boolean) => {
    shieldRef.current?.classList.toggle("hidden", !on);
    // The map is unselectable, but a drag that starts on it still extends the
    // browser's selection into the panel beside it: freeze selection for the
    // pan, and drop whatever the press was about to drag out of.
    document.body.classList.toggle("map-dragging", on);
    if (on) globalThis.getSelection()?.removeAllRanges();
  }, []);
  useEffect(() => () => document.body.classList.remove("map-dragging"), []);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [animating, setAnimating] = useState<Map<string, TrackPhase>>(() => new Map());
  const prevReadRef = useRef<Set<string> | null>(null);
  const surface = useMemo(() => surfaceGeometry(layout, CURRICULUM, MAP_BOUNDS, RIVER), [layout]);
  const world = useMemo(() => worldOf(surface.islandPolygon), [surface]);
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);
  const clampWidth = useCallback((w: number) => clamp(w, MIN_VIEW_W, worldRef.current.w * MAX_VIEW_SCALE), []);

  const measureWrap = useCallback(() => {
    rectRef.current = svgRef.current?.parentElement?.getBoundingClientRect() ?? new DOMRect(0, 0, 1200, 1000);
    return rectRef.current;
  }, []);
  const wrapRect = useCallback(() => rectRef.current ?? measureWrap(), [measureWrap]);
  /** The fraction of the map's width under the open panel. */
  const measureHidden = useCallback(
    (open: boolean) => {
      const panelW = open ? (panelRef.current?.getBoundingClientRect().width ?? 0) : 0;
      const fraction = panelW / wrapRect().width;
      hiddenRef.current = fraction < MAX_HIDDEN ? fraction : 0;
      return hiddenRef.current;
    },
    [panelRef, wrapRect],
  );
  useEffect(() => {
    measureHidden(panelOpen);
  }, [panelOpen, measureHidden]);
  const aspect = useCallback(() => {
    const rect = wrapRect();
    return rect.width < 10 || rect.height < 10 ? 1.2 : rect.width / rect.height;
  }, [wrapRect]);

  // Use one camera representation throughout a gesture. Scaling an oversized
  // SVG bitmap and periodically rebasing its viewBox changes raster scale and
  // non-scaling strokes mid-zoom; dropping the compositor layer at rest adds
  // another visible handoff. A viewport-sized SVG needs neither operation.
  const paint = useCallback(() => {
    paintFrame.current = null;
    const svg = svgRef.current;
    if (!svg) return;
    const v = { ...pending.current };
    const viewBox = `${v.x} ${v.y} ${v.w} ${v.h}`;
    if (svg.getAttribute("viewBox") !== viewBox) svg.setAttribute("viewBox", viewBox);
    for (const fn of listeners.current) fn(v);
  }, []);

  const settle = useCallback(() => {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    if (paintFrame.current !== null) cancelAnimationFrame(paintFrame.current);
    paint();
    svgRef.current?.classList.remove("moving");
  }, [paint]);

  const render = useCallback(
    (settleSoon: boolean) => {
      const svg = svgRef.current;
      if (!svg) return;
      if (!flightRef.current) clampView(pending.current, worldRef.current, pending.current.w * hiddenRef.current);
      svg.classList.add("moving");
      // Wheel/pointer events can arrive faster than the display refresh rate.
      // Publish the view to the SVG, trains and minimap together when it paints.
      if (paintFrame.current === null) paintFrame.current = requestAnimationFrame(paint);
      if (settleSoon) {
        if (settleTimer.current !== null) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(settle, SETTLE_DELAY);
      }
    },
    [paint, settle],
  );

  const stopGlide = useCallback(() => {
    if (!glideRef.current) return false;
    cancelAnimationFrame(glideRef.current);
    glideRef.current = null;
    return true;
  }, []);

  const glide = useCallback(
    (vx: number, vy: number) => {
      let speedX = vx;
      let speedY = vy;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(64, now - last);
        last = now;
        const decay = GLIDE_FRICTION ** (dt / 16.6667);
        speedX *= decay;
        speedY *= decay;
        const v = pending.current;
        const unitsPerPixel = v.w / wrapRect().width;
        const stepX = speedX * dt * unitsPerPixel;
        const stepY = speedY * dt * unitsPerPixel;
        const fromX = v.x;
        const fromY = v.y;
        v.x -= stepX;
        v.y -= stepY;
        render(false);
        if (Math.abs(v.x - fromX) < Math.abs(stepX) / 2) speedX = 0;
        if (Math.abs(v.y - fromY) < Math.abs(stepY) / 2) speedY = 0;
        if (Math.hypot(speedX, speedY) < GLIDE_MIN_SPEED) {
          glideRef.current = null;
          settle();
          return;
        }
        glideRef.current = requestAnimationFrame(step);
      };
      glideRef.current = requestAnimationFrame(step);
    },
    [render, settle, wrapRect],
  );

  const setViewCentered = useCallback(
    (centreX: number, centreY: number, w: number, commitSoon = true) => {
      const v = pending.current;
      v.w = clampWidth(w);
      v.h = v.w / aspect();
      v.x = centreX - v.w / 2;
      v.y = centreY - v.h / 2;
      render(commitSoon);
    },
    [render, aspect, clampWidth],
  );

  /** Fly so that the point is centred, and the width shown, in the part of the map the panel leaves visible. */
  const flyTo = useCallback(
    (centreX: number, centreY: number, seenW: number, duration = 850) => {
      stopGlide();
      if (settleTimer.current !== null) {
        clearTimeout(settleTimer.current);
        settleTimer.current = null;
      }
      if (flightRef.current) cancelAnimationFrame(flightRef.current);
      const v = pending.current;
      const from = { cx: v.x + v.w / 2, cy: v.y + v.h / 2, w: v.w };
      // Clamp where the flight lands, once, so the path between two in-bounds
      // views can be a straight line. Clamping every frame instead pins the
      // camera for as long as the view is wider than the world and then lurches
      // it through the rest of the pan, which is the dog-leg the intro showed.
      const b = worldRef.current;
      const targetW = clampWidth(seenW / (1 - hiddenRef.current));
      const hiddenW = targetW * hiddenRef.current;
      const target = {
        cx: panCentre(centreX, panRange(b.x, b.w, targetW - hiddenW), b.x + b.w / 2) + hiddenW / 2,
        cy: panCentre(centreY, panRange(b.y, b.h, targetW / aspect()), b.y + b.h / 2),
        w: targetW,
      };
      const start = performance.now();
      const flightMs = reducedMotion() ? 1 : duration;
      const step = (now: number) => {
        const k = easeInOut(Math.min(1, (now - start) / flightMs));
        setViewCentered(
          from.cx + (target.cx - from.cx) * k,
          from.cy + (target.cy - from.cy) * k,
          from.w + (target.w - from.w) * k,
          false,
        );
        if (k < 1) {
          flightRef.current = requestAnimationFrame(step);
          return;
        }
        // Clearing the flight first makes this last render clamp, which matters
        // only if the viewport changed shape mid-flight.
        flightRef.current = null;
        render(false);
        settle();
      };
      flightRef.current = requestAnimationFrame(step);
    },
    [setViewCentered, settle, clampWidth, stopGlide, aspect, render],
  );

  const fitAll = useCallback(
    (duration?: number) => {
      const b = worldRef.current;
      flyTo(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h * aspect()), duration);
    },
    [flyTo, aspect],
  );

  const toMap = useCallback(
    (clientX: number, clientY: number): Pt => {
      const rect = wrapRect();
      const p = pending.current;
      const unitsPerPixel = p.w / rect.width;
      return { x: p.x + (clientX - rect.left) * unitsPerPixel, y: p.y + (clientY - rect.top) * unitsPerPixel };
    },
    [wrapRect],
  );

  const toScreen = (pt: Pt): Pt => {
    const rect = wrapRect();
    const p = pending.current;
    const pixelsPerUnit = rect.width / p.w;
    return { x: (pt.x - p.x) * pixelsPerUnit, y: (pt.y - p.y) * pixelsPerUnit };
  };

  const zoomAt = useCallback(
    (factor: number, clientX: number, clientY: number, commitSoon = true) => {
      const focus = toMap(clientX, clientY);
      const v = pending.current;
      const w = clampWidth(v.w * factor);
      const k = w / v.w;
      v.x = focus.x - (focus.x - v.x) * k;
      v.y = focus.y - (focus.y - v.y) * k;
      v.w = w;
      v.h = w / aspect();
      render(commitSoon);
    },
    [render, aspect, toMap, clampWidth],
  );

  const seenWidth = useCallback(() => pending.current.w * (1 - hiddenRef.current), []);

  useImperativeHandle(
    ref,
    () => ({
      flyToStation: (id) => {
        const s = layout.stations[id];
        if (s) flyTo(s.pt.x, s.pt.y, Math.min(seenWidth(), 1500), 700);
      },
      flyToLine: (id) => {
        const line = CURRICULUM.lines.find((l) => l.id === id);
        if (!line) return;
        const b = lineBounds(line, layout);
        const w = Math.max(b.maxX - b.minX, (b.maxY - b.minY) * aspect() * (1 - hiddenRef.current), 900);
        flyTo((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, w);
      },
      fitAll: () => fitAll(),
      zoomBy: (factor) => {
        const rect = wrapRect();
        zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
      },
    }),
    [layout, flyTo, fitAll, zoomAt, aspect, wrapRect, seenWidth],
  );

  // A station picked on the map can be under the panel that opens for it:
  // bring it into the part of the map the panel leaves visible.
  useEffect(() => {
    if (!selectedId || flightRef.current) return;
    const s = layout.stations[selectedId];
    const hidden = measureHidden(panelOpen);
    if (!s || hidden === 0) return;
    const rect = wrapRect();
    const v = pending.current;
    const screenX = ((s.pt.x - v.x) / v.w) * rect.width;
    if (screenX < rect.width * (1 - hidden) - NUDGE_MARGIN) return;
    flyTo(s.pt.x, s.pt.y, seenWidth(), 500);
  }, [selectedId, panelOpen, layout, measureHidden, wrapRect, flyTo, seenWidth]);

  useEffect(() => {
    const wrap = svgRef.current?.parentElement;
    if (!wrap) return;
    const keepAspect = () => {
      measureWrap();
      measureHidden(panelOpenRef.current);
      if (flightRef.current) return;
      const v = pending.current;
      setViewCentered(v.x + v.w / 2, v.y + v.h / 2, v.w, false);
      settle();
    };
    const observer = new ResizeObserver(keepAspect);
    observer.observe(wrap);
    window.addEventListener("scroll", measureWrap, { passive: true });
    window.visualViewport?.addEventListener("resize", measureWrap);
    measureWrap();
    const b = worldRef.current;
    setViewCentered(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h * aspect()) * 1.08, false);
    settle();
    flyTo(
      START_VIEW.cx,
      START_VIEW.cy,
      Math.max(START_VIEW.w, START_VIEW.h * aspect()),
      lite ? LITE_FLIGHT_MS : Math.max(3000, schedule.total - 1200) + 1800,
    );
    return () => {
      observer.disconnect();
      stopGlide();
      if (flightRef.current !== null) {
        cancelAnimationFrame(flightRef.current);
        flightRef.current = null;
      }
      if (paintFrame.current !== null) {
        cancelAnimationFrame(paintFrame.current);
        paintFrame.current = null;
      }
      if (settleTimer.current !== null) {
        clearTimeout(settleTimer.current);
        settleTimer.current = null;
      }
      window.removeEventListener("scroll", measureWrap);
      window.visualViewport?.removeEventListener("resize", measureWrap);
    };
  }, [setViewCentered, settle, flyTo, aspect, measureWrap, measureHidden, schedule.total, stopGlide, lite]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopGlide();
      if (flightRef.current) {
        cancelAnimationFrame(flightRef.current);
        flightRef.current = null;
      }
      setHover(null);
      if (event.ctrlKey || event.metaKey) {
        zoomAt(Math.exp(event.deltaY * 0.01), event.clientX, event.clientY);
        return;
      }
      const v = pending.current;
      const unitsPerPixel = v.w / wrapRect().width;
      v.x += event.deltaX * unitsPerPixel;
      v.y += event.deltaY * unitsPerPixel;
      render(true);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt, render, wrapRect, stopGlide]);

  // Pinching the map used to scale the whole document instead. `touch-action:
  // none` is enough for Chrome, but WebKit zooms the page through its own
  // non-standard gesture events, which touch-action does not govern. Block the
  // page gesture over the map so two fingers there always reach the map's own
  // zoom, and only there: the station panel and the journey pages are outside
  // .map-wrap and still pinch-zoom for anyone reading them.
  useEffect(() => {
    const overMap = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(".map-wrap"));
    const stopGesture = (event: Event) => {
      if (overMap(event.target)) event.preventDefault();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1 && overMap(event.target)) event.preventDefault();
    };
    const opts = { passive: false };
    document.addEventListener("gesturestart", stopGesture, opts);
    document.addEventListener("gesturechange", stopGesture, opts);
    document.addEventListener("gestureend", stopGesture, opts);
    document.addEventListener("touchmove", onTouchMove, opts);
    return () => {
      document.removeEventListener("gesturestart", stopGesture);
      document.removeEventListener("gesturechange", stopGesture);
      document.removeEventListener("gestureend", stopGesture);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const popStation = useCallback(
    (station: Station, colour: string) => {
      const el = stationRefs.current.get(station.id);
      if (!el) return;
      el.classList.remove("pop");
      el.getBoundingClientRect();
      el.classList.add("pop");
      el.querySelector(".core")?.addEventListener("animationend", () => el.classList.remove("pop"), { once: true });
      const r = layout.stations[station.id].interchange ? INTERCHANGE_RADIUS : STATION_RADIUS[station.tag];
      const ripple = document.createElementNS(SVG_NS, station.tag === "exercise" ? "rect" : "circle");
      ripple.setAttribute("class", "ripple");
      ripple.style.setProperty("--c", colour);
      if (station.tag === "exercise") {
        ripple.setAttribute("x", String(-r));
        ripple.setAttribute("y", String(-r));
        ripple.setAttribute("width", String(r * 2));
        ripple.setAttribute("height", String(r * 2));
        ripple.setAttribute("rx", "3");
      } else {
        ripple.setAttribute("r", String(r));
      }
      el.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    },
    [layout],
  );

  const animateSegment = useCallback(
    (line: Line, fromPos: number, toPos: number, done: () => void) => {
      const layer = animLayerRef.current;
      const lineLayout = layout.lines[line.id];
      if (!layer) {
        done();
        return;
      }
      const glow = document.createElementNS(SVG_NS, "path");
      glow.setAttribute("d", lineLayout.d);
      glow.setAttribute("class", "track-anim-glow");
      glow.setAttribute("stroke", colours[line.id]);
      const overlay = document.createElementNS(SVG_NS, "path");
      overlay.setAttribute("d", lineLayout.d);
      overlay.setAttribute("class", "track-anim");
      overlay.setAttribute("stroke", colours[line.id]);
      const head = document.createElementNS(SVG_NS, "circle");
      head.setAttribute("r", "7");
      head.setAttribute("fill", colours[line.id]);
      head.setAttribute("stroke", "#fff");
      head.setAttribute("stroke-width", "2.5");
      layer.append(glow, overlay, head);
      const distance = toPos - fromPos;
      const duration = 260 + Math.min(1100, distance * 5);
      const start = performance.now();
      const step = (now: number) => {
        const k = easeInOut(Math.min(1, (now - start) / duration));
        const headPos = fromPos + distance * k;
        const dash = dashArray(
          spanIntervals(fromPos, headPos, lineLayout.length).sort((a, b) => a[0] - b[0]),
          lineLayout.length,
        );
        overlay.setAttribute("stroke-dasharray", dash);
        glow.setAttribute("stroke-dasharray", dash);
        const p = lineLayout.pointAt(headPos % lineLayout.length);
        head.setAttribute("cx", String(p.x));
        head.setAttribute("cy", String(p.y));
        if (k < 1) {
          requestAnimationFrame(step);
          return;
        }
        done();
        head.remove();
        for (const el of [glow, overlay]) {
          el.style.transition = "opacity .4s";
          el.style.opacity = "0";
        }
        setTimeout(() => {
          glow.remove();
          overlay.remove();
        }, 450);
      };
      requestAnimationFrame(step);
    },
    [layout, colours],
  );

  const growFrontier = useCallback(
    (line: Line, fromPos: number, toPos: number, done: () => void) => {
      const layer = animLayerRef.current;
      const lineLayout = layout.lines[line.id];
      if (!layer) {
        done();
        return;
      }
      const dashed = document.createElementNS(SVG_NS, "path");
      dashed.setAttribute("class", "track-next");
      dashed.setAttribute("stroke", colours[line.id]);
      layer.append(dashed);
      lockFlowPhase(dashed);
      const distance = toPos - fromPos;
      // The frontier grows backwards down the line as often as forwards, so the
      // distance is signed. Timing it on the signed value gave a negative
      // duration, an easing that never reached 1, and a frame loop that never
      // ended — writing a path that grew cubically with every frame. That was
      // the lag that set in after marking a station read.
      const duration = 220 + Math.min(900, Math.abs(distance) * 4);
      const start = performance.now();
      const step = (now: number) => {
        const k = easeInOut(Math.min(1, (now - start) / duration));
        dashed.setAttribute(
          "d",
          intervalsPath(lineLayout, spanIntervals(fromPos, fromPos + distance * k, lineLayout.length)),
        );
        if (k < 1) {
          requestAnimationFrame(step);
          return;
        }
        done();
        setTimeout(() => dashed.remove(), 80);
      };
      requestAnimationFrame(step);
    },
    [layout, colours],
  );

  useEffect(() => {
    const read = new Set<string>();
    for (const line of CURRICULUM.lines) for (const s of line.stations) if (isRead(progress, s.id)) read.add(s.id);
    const prev = prevReadRef.current;
    prevReadRef.current = read;
    if (!prev) return;
    const fresh = [...read].filter((id) => !prev.has(id));
    if (fresh.length === 0) return;
    setAnimating((current) => {
      const n = new Map(current);
      for (const id of fresh) n.set(id, "fill");
      return n;
    });
    for (const id of fresh) {
      const line = lineOf.get(id);
      if (!line) continue;
      const station = line.stations.find((s) => s.id === id);
      if (!station) continue;
      popStation(station, colours[line.id]);
      const length = layout.lines[line.id].length;
      const nodes = trackNodes(line, layout);
      const at = nodes.findIndex((n) => n.id === id);
      const own = nodes[at].pos;
      const before = nodeBefore(line, nodes, at);
      const after = nodeAfter(line, nodes, at);
      const finish = () =>
        setAnimating((current) => {
          const n = new Map(current);
          n.delete(id);
          return n;
        });
      const runAll = (jobs: Array<(done: () => void) => void>, done: () => void) => {
        if (jobs.length === 0) {
          done();
          return;
        }
        let left = jobs.length;
        for (const job of jobs) {
          job(() => {
            if (--left === 0) done();
          });
        }
      };
      const reveal = () => {
        setAnimating((current) => {
          const n = new Map(current);
          n.set(id, "grow");
          return n;
        });
        const grows = CURRICULUM.lines.flatMap((track) => {
          const trackNodesList = trackNodes(track, layout);
          const index = trackNodesList.findIndex((n) => n.id === id);
          if (index < 0) return [];
          const trackLength = layout.lines[track.id].length;
          const from = trackNodesList[index].pos;
          const nextNode = nodeAfter(track, trackNodesList, index);
          const prevNode = nodeBefore(track, trackNodesList, index);
          const out: Array<(done: () => void) => void> = [];
          if (nextNode && !isRead(progress, nextNode.id))
            out.push((done) =>
              growFrontier(track, from, nextNode.pos > from ? nextNode.pos : trackLength + nextNode.pos, done),
            );
          if (prevNode && !isRead(progress, prevNode.id))
            out.push((done) =>
              growFrontier(track, from, prevNode.pos < from ? prevNode.pos : prevNode.pos - trackLength, done),
            );
          return out;
        });
        runAll(grows, finish);
      };
      const fills: Array<(done: () => void) => void> = [];
      if (before && isRead(progress, before.id))
        fills.push((done) => animateSegment(line, before.pos, own <= before.pos ? length + own : own, done));
      if (after && isRead(progress, after.id))
        fills.push((done) => animateSegment(line, own, after.pos > own ? after.pos : length + after.pos, done));
      runAll(fills, reveal);
    }
  }, [progress, layout, colours, popStation, animateSegment, growFrontier]);

  const { intervalsByLine, frontierByLine } = useMemo(() => {
    const solid: Record<string, Interval[]> = {};
    const frontier: Record<string, string> = {};
    for (const line of CURRICULUM.lines) {
      const l = layout.lines[line.id];
      const list: Interval[] = [];
      const dashed: Interval[] = [];
      const nodes = trackNodes(line, layout);
      nodes.forEach((node, i) => {
        const next = nodeAfter(line, nodes, i);
        if (!next) return;
        const readA = isRead(progress, node.id);
        const readB = isRead(progress, next.id);
        if (!readA && !readB) return;
        const segments: Interval[] =
          next.pos > node.pos
            ? [[node.pos, next.pos]]
            : [
                [node.pos, l.length],
                [0, next.pos],
              ];
        if (readA && readB) {
          if (animating.get(node.id) === "fill" || animating.get(next.id) === "fill") dashed.push(...segments);
          else list.push(...segments);
        } else if (!animating.has(readA ? node.id : next.id)) {
          dashed.push(...segments);
        }
      });
      solid[line.id] = list.sort((a, b) => a[0] - b[0]);
      frontier[line.id] = intervalsPath(l, dashed);
    }
    return { intervalsByLine: solid, frontierByLine: frontier };
  }, [layout, progress, animating]);

  const dashByLine = useMemo(
    () =>
      Object.fromEntries(
        CURRICULUM.lines.map((line) => [line.id, dashArray(intervalsByLine[line.id], layout.lines[line.id].length)]),
      ),
    [intervalsByLine, layout],
  );
  const statusKeys = useMemo(
    () =>
      Object.fromEntries(
        CURRICULUM.lines.map((line) => [
          line.id,
          line.stations.map((s) => statusChar(statusOf(progress, s.id), completeIds.has(s.id))).join(""),
        ]),
      ),
    [progress, completeIds],
  );
  const litKey = useMemo(
    () => CURRICULUM.links.map(([a, b]) => (isRead(progress, a) && isRead(progress, b) ? "1" : "0")).join(""),
    [progress],
  );
  const readEndsByLine = useMemo(
    () =>
      Object.fromEntries(
        CURRICULUM.lines.map((line) => [
          line.id,
          layout.lines[line.id].termini.map((end) => (isRead(progress, end.stationId) ? "1" : "0")).join(""),
        ]),
      ),
    [layout, progress],
  );
  const activeLines = useMemo(
    () =>
      new Set(
        Object.entries(intervalsByLine)
          .filter(([, l]) => l.length)
          .map(([id]) => id),
      ),
    [intervalsByLine],
  );
  const selectedLineId = selectedId ? (lineOf.get(selectedId)?.id ?? null) : null;
  const focusIds = useMemo(() => {
    const line = CURRICULUM.lines.find((l) => l.id === focusLineId);
    if (!line) return null;
    const ids = new Set(line.stations.map((s) => s.id));
    if (line.from) ids.add(line.from);
    for (const waypoint of line.path) {
      if (!Array.isArray(waypoint)) ids.add(waypoint.through);
    }
    return ids;
  }, [focusLineId]);

  const subscribe = useCallback((fn: CameraListener) => {
    listeners.current.add(fn);
    fn(pending.current);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const register = useCallback((id: string, el: SVGGElement | null) => {
    if (el) stationRefs.current.set(id, el);
    else stationRefs.current.delete(id);
  }, []);

  const pinchGeometry = () => {
    const [a, b] = [...pointersRef.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    stopGlide();
    if (flightRef.current) {
      cancelAnimationFrame(flightRef.current);
      flightRef.current = null;
    }
    // A click can interrupt the wheel's settling timer too. Flush that view
    // and resume ambient animations even when this press never becomes a pan.
    settle();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointersRef.current.size === 2) {
      dragRef.current = null;
      pinchRef.current = pinchGeometry();
      setDragging(true);
      setHover(null);
      return;
    }
    if (pointersRef.current.size > 2) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: pending.current.x,
      oy: pending.current.y,
      moved: false,
      target: e.target as Element,
      trail: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
    };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pointers = pointersRef.current;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    if (pinch) {
      if (pointers.size < 2) return;
      const now = pinchGeometry();
      const v = pending.current;
      const unitsPerPixel = v.w / wrapRect().width;
      v.x -= (now.mid.x - pinch.mid.x) * unitsPerPixel;
      v.y -= (now.mid.y - pinch.mid.y) * unitsPerPixel;
      zoomAt(pinch.dist / now.dist, now.mid.x, now.mid.y, false);
      pinchRef.current = now;
      return;
    }
    const d = dragRef.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(true);
        setHover(null);
      }
      d.trail.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (d.trail.length > 2 && e.timeStamp - d.trail[0].t > FLICK_WINDOW) d.trail.shift();
      const unitsPerPixel = pending.current.w / wrapRect().width;
      pending.current.x = d.ox - dx * unitsPerPixel;
      pending.current.y = d.oy - dy * unitsPerPixel;
      render(false);
      return;
    }
    if (e.pointerType !== "mouse") return;
    const id = (e.target as Element).closest<SVGGElement>(".station")?.dataset.id;
    if (!id) {
      if (hover) setHover(null);
      return;
    }
    if (hover?.id === id) return;
    const screen = toScreen(layout.stations[id].pt);
    setHover({ id, x: screen.x, y: screen.y });
  };
  const releasePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (!pinchRef.current) return false;
    if (pointersRef.current.size === 0) {
      pinchRef.current = null;
      setDragging(false);
      settle();
    }
    return true;
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (releasePointer(e)) return;
    const pressed = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!pressed) {
      settle();
      return;
    }
    if (pressed.moved) {
      const flick = reducedMotion() ? null : flickVelocity(pressed.trail, e.timeStamp);
      if (flick) glide(flick.vx, flick.vy);
      else settle();
      return;
    }
    const pressedId = pressed.target?.closest<SVGElement>("[data-id]")?.dataset.id;
    if (pressedId !== undefined) {
      onSelect(pressedId);
      return;
    }
    const pressedLineId = pressed.target?.closest<SVGElement>(".pill")?.dataset.line;
    if (pressedLineId !== undefined) {
      onPinLine(pressedLineId);
      return;
    }
    onPinLine(null);
  };

  const flyToHere = useCallback(() => {
    const s = hereId ? layout.stations[hereId] : null;
    if (s) flyTo(s.pt.x, s.pt.y, Math.min(pending.current.w, 1500), 700);
  }, [hereId, layout, flyTo]);

  const dim = (lineId: string) => (focusLineId ? String(lineId !== focusLineId) : undefined);
  const hoverStation = hover ? lineOf.get(hover.id)?.stations.find((s) => s.id === hover.id) : null;

  return (
    <>
      <svg
        ref={svgRef}
        className="map-svg absolute inset-0 size-full"
        xmlns={SVG_NS}
        role="img"
        aria-label="RL curriculum tube map"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => {
          if (releasePointer(e)) return;
          dragRef.current = null;
          setDragging(false);
          settle();
        }}
        onPointerLeave={() => setHover(null)}
      >
        <Island surface={surface} introMs={schedule.total} clipId={islandClipId} />
        <Zones clipId={islandClipId} />
        <g>
          {CURRICULUM.lines.map((line) => (
            <Track
              key={line.id}
              line={line}
              layout={layout}
              schedule={schedule}
              colour={colours[line.id]}
              dash={dashByLine[line.id]}
              frontier={frontierByLine[line.id]}
              readEnds={readEndsByLine[line.id]}
              masked={intro}
              dim={dim(line.id)}
            />
          ))}
        </g>
        <g ref={animLayerRef} />
        <g>
          {CURRICULUM.lines.map((line) => (
            <LineLamps
              key={line.id}
              line={line}
              layout={layout}
              schedule={schedule}
              statusKey={statusKeys[line.id]}
              focusIds={focusIds}
            />
          ))}
        </g>
        <g>
          {CURRICULUM.lines.map((line) => (
            <LineBooths
              key={line.id}
              line={line}
              layout={layout}
              schedule={schedule}
              statusKey={statusKeys[line.id]}
              focusIds={focusIds}
            />
          ))}
        </g>
        <River layout={layout} surface={surface} colours={colours} />
        <LinkLayer
          layout={layout}
          colours={colours}
          litKey={litKey}
          selectedId={selectedId}
          focusLineId={focusLineId}
        />
        <g>
          {CURRICULUM.lines.map((line) => (
            <Pill
              key={line.id}
              line={line}
              at={layout.pills[line.id]}
              colour={colours[line.id]}
              delay={schedule.lineStart[line.id] + 600}
              dim={dim(line.id)}
            />
          ))}
        </g>
        <g>
          {CURRICULUM.lines.map((line) => (
            <LineStations
              key={line.id}
              line={line}
              layout={layout}
              schedule={schedule}
              colour={colours[line.id]}
              statusKey={statusKeys[line.id]}
              nextId={nextIds[line.id]}
              hereId={hereId && lineOf.get(hereId)?.id === line.id ? hereId : null}
              selectedId={selectedLineId === line.id ? selectedId : null}
              focusIds={focusIds}
              register={register}
            />
          ))}
        </g>
        <g>
          {CURRICULUM.lines.map((line) => (
            <LineLabels
              key={line.id}
              line={line}
              layout={layout}
              schedule={schedule}
              colour={colours[line.id]}
              statusKey={statusKeys[line.id]}
              nextId={nextIds[line.id]}
              selectedId={selectedLineId === line.id ? selectedId : null}
              focusIds={focusIds}
            />
          ))}
        </g>
        {hereId && layout.stations[hereId] ? (
          <YouAreHere
            pt={layout.stations[hereId].pt}
            colour={colours[layout.stations[hereId].lineId]}
            delay={schedule.total}
            onClick={() => onSelect(hereId)}
          />
        ) : null}
      </svg>
      <Trains
        layout={layout}
        intervals={intervalsByLine}
        count={trainCount}
        focusLineId={focusLineId}
        subscribe={subscribe}
        river={surface.river}
        revealAfterMs={lite ? LITE_INTRO_MS : schedule.total}
      />
      <div ref={shieldRef} className="drag-shield absolute inset-0 hidden" />
      {hereId && layout.stations[hereId] ? (
        <HerePin
          pt={layout.stations[hereId].pt}
          colour={colours[layout.stations[hereId].lineId]}
          wrapRect={wrapRect}
          subscribe={subscribe}
          onClick={flyToHere}
        />
      ) : null}

      {hover && hoverStation ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] text-paper shadow-[0_6px_18px_rgba(0,0,0,.18)] after:absolute after:-bottom-[5px] after:left-1/2 after:size-2.5 after:-translate-x-1/2 after:rotate-45 after:bg-ink"
          style={{ left: hover.x, top: hover.y }}
        >
          {hoverStation.name}
          <small className="block text-[11px] opacity-70">
            {lineOf.get(hover.id)?.name} · {hoverStation.tag}
            {statusOf(progress, hover.id) !== "unread" && ` · ${statusOf(progress, hover.id)}`}
          </small>
        </div>
      ) : null}

      <Minimap
        layout={layout}
        surface={surface}
        colours={colours}
        activeLines={activeLines}
        subscribe={subscribe}
        onJump={(x, y) => {
          setViewCentered(x, y, pending.current.w, false);
          settle();
        }}
      />
    </>
  );
}

function YouAreHere({ pt, colour, delay, onClick }: { pt: Pt; colour: string; delay: number; onClick: () => void }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer shortcut for selecting the station it marks
    <g
      className="you-are-here"
      transform={`translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`}
      style={{ "--delay": `${delay.toFixed(0)}ms` } as React.CSSProperties}
      onClick={onClick}
    >
      <g className="you-are-here-scale">
        <g className="you-are-here-bob">
          <path d="M -8 -50 L 0 -36 L 8 -50 Z" fill={colour} />
          <rect x={-68} y={-78} width={136} height={30} rx={15} fill={colour} />
          <circle cx={-51} cy={-63} r={5.5} fill="#fff" />
          <circle cx={-51} cy={-63} r={2.2} fill={colour} />
          <text
            x={-38}
            y={-63}
            textAnchor="start"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={12.5}
            letterSpacing="0.08em"
          >
            YOU ARE HERE
          </text>
        </g>
      </g>
    </g>
  );
}
