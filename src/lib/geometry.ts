import type { Curriculum, Line, PillPoint, Waypoint } from "./curriculum";

export interface Pt {
  x: number;
  y: number;
}

export interface LabelPlacement {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  baseline: "auto" | "middle" | "hanging";
}

export interface StationLayout {
  id: string;
  lineId: string;
  index: number;
  pos: number;
  pt: Pt;
  tangent: Pt;
  label: LabelPlacement;
  interchange: boolean;
}

export interface Terminus {
  pt: Pt;
  tangent: Pt;
  stationId: string;
  outward: 1 | -1;
}

export interface LineLayout {
  id: string;
  d: string;
  length: number;
  pointAt: (s: number) => Pt;
  tangentAt: (s: number) => Pt;
  posOf: (pt: Pt) => number;
  termini: Terminus[];
}

export interface MapLayout {
  lines: Record<string, LineLayout>;
  stations: Record<string, StationLayout>;
  pills: Record<string, PillPoint>;
}

export const CORNER_RADIUS = 46;
export const LABEL_GAP = 20;
export const STATION_RADIUS: Record<string, number> = { essential: 10, project: 10, deeper: 8, optional: 8 };
export const INTERCHANGE_RADIUS = 13;
const PILL_OFFSET = 56;
const PILL_SIDE_OFFSET = 30;
const DEFAULT_START_PAD = 80;
const CURVE_STEPS = 12;

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const norm = (a: Pt) => scale(a, 1 / (len(a) || 1));
const fmt = (p: Pt) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

function cornerCut(prev: Pt, corner: Pt, next: Pt) {
  const inDir = norm(sub(corner, prev));
  const outDir = norm(sub(next, corner));
  const r = Math.min(CORNER_RADIUS, len(sub(corner, prev)) / 2, len(sub(next, corner)) / 2);
  return { a: add(corner, scale(inDir, -r)), b: add(corner, scale(outDir, r)) };
}

interface BuiltPath {
  d: string;
  points: Pt[];
  cumulative: number[];
  length: number;
  waypointPos: number[];
}

function quadPoints(a: Pt, control: Pt, b: Pt): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
    });
  }
  return out;
}

function buildPath(waypoints: Pt[], closed: boolean): BuiltPath {
  const n = waypoints.length;
  const points: Pt[] = [];
  const waypointPos: number[] = [];
  let d = "";
  const push = (p: Pt) => points.push(p);

  if (!closed) {
    d = `M ${fmt(waypoints[0])}`;
    push(waypoints[0]);
    waypointPos.push(0);
    for (let i = 1; i < n - 1; i++) {
      const { a, b } = cornerCut(waypoints[i - 1], waypoints[i], waypoints[i + 1]);
      d += ` L ${fmt(a)} Q ${fmt(waypoints[i])} ${fmt(b)}`;
      push(a);
      quadPoints(a, waypoints[i], b).forEach(push);
      waypointPos.push(points.length - 1);
    }
    d += ` L ${fmt(waypoints[n - 1])}`;
    push(waypoints[n - 1]);
    waypointPos.push(points.length - 1);
  } else {
    const first = cornerCut(waypoints[n - 1], waypoints[0], waypoints[1]);
    d = `M ${fmt(first.b)}`;
    push(first.b);
    waypointPos.push(0);
    for (let i = 1; i < n; i++) {
      const { a, b } = cornerCut(waypoints[i - 1], waypoints[i], waypoints[(i + 1) % n]);
      d += ` L ${fmt(a)} Q ${fmt(waypoints[i])} ${fmt(b)}`;
      push(a);
      quadPoints(a, waypoints[i], b).forEach(push);
      waypointPos.push(points.length - 1);
    }
    d += ` L ${fmt(first.a)} Q ${fmt(waypoints[0])} ${fmt(first.b)} Z`;
    push(first.a);
    quadPoints(first.a, waypoints[0], first.b).forEach(push);
  }

  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + len(sub(points[i], points[i - 1])));
  const length = cumulative[cumulative.length - 1];
  return { d, points, cumulative, length, waypointPos: waypointPos.map((idx) => cumulative[idx]) };
}

function makeSampler(built: BuiltPath) {
  const { points, cumulative, length } = built;
  const locate = (s: number) => {
    const target = Math.min(Math.max(s, 0), length);
    let lo = 0;
    let hi = cumulative.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] <= target) lo = mid;
      else hi = mid;
    }
    const segLen = cumulative[hi] - cumulative[lo] || 1;
    return { lo, hi, t: (target - cumulative[lo]) / segLen };
  };
  const pointAt = (s: number): Pt => {
    const { lo, hi, t } = locate(s);
    return add(points[lo], scale(sub(points[hi], points[lo]), t));
  };
  const tangentAt = (s: number): Pt => {
    const { lo, hi } = locate(s);
    return norm(sub(points[hi], points[lo]));
  };
  return { pointAt, tangentAt };
}

function nearestPos(built: BuiltPath, target: Pt): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 1; i < built.points.length; i++) {
    const a = built.points[i - 1];
    const b = built.points[i];
    const ab = sub(b, a);
    const segLen2 = ab.x * ab.x + ab.y * ab.y || 1;
    const t = Math.min(1, Math.max(0, ((target.x - a.x) * ab.x + (target.y - a.y) * ab.y) / segLen2));
    const p = add(a, scale(ab, t));
    const d = len(sub(target, p));
    if (d < bestDist) {
      bestDist = d;
      best = built.cumulative[i - 1] + t * Math.sqrt(segLen2);
    }
  }
  return best;
}

function stationPositions(line: Line, built: BuiltPath): number[] {
  const count = line.stations.length;
  const L = built.length;
  if (line.snap) {
    if (line.snap.length !== count) throw new Error(`${line.id}: snap has ${line.snap.length} points for ${count} stations`);
    return line.snap.map(([x, y]) => nearestPos(built, { x, y }));
  }
  if (line.closed) {
    const pad = line.stationPad ?? 0;
    if (pad === 0) return line.stations.map((_, i) => (i * L) / count + L * 0.04);
    return line.stations.map((_, i) => pad + (i * (L - 2 * pad)) / (count - 1));
  }
  let startPad = line.startPad ?? (line.from ? DEFAULT_START_PAD : 0);
  if (line.stationsFrom !== undefined) startPad = built.waypointPos[line.stationsFrom] + (line.startPad ?? 0);
  const endPad = line.endPad ?? 0;
  return line.stations.map((_, i) => startPad + (i * (L - startPad - endPad)) / (count - 1));
}

function placeLabel(pt: Pt, normal: Pt, radius: number): LabelPlacement {
  const gap = LABEL_GAP + radius - 8;
  return {
    x: pt.x + normal.x * gap,
    y: pt.y + normal.y * gap,
    anchor: Math.abs(normal.x) < 0.3 ? "middle" : normal.x < 0 ? "end" : "start",
    baseline: normal.y > 0.3 ? "hanging" : normal.y < -0.3 ? "auto" : "middle",
  };
}

function labelFor(line: Line, index: number, pt: Pt, tangent: Pt, centroid: Pt, radius: number): LabelPlacement {
  let normal: Pt;
  if (line.closed) {
    normal = norm(sub(pt, centroid));
    if (Math.abs(normal.x) > Math.abs(normal.y) * 1.6) normal = { x: Math.sign(normal.x), y: 0 };
    else if (Math.abs(normal.y) > Math.abs(normal.x) * 1.6) normal = { x: 0, y: Math.sign(normal.y) };
  } else if (Math.abs(tangent.x) > Math.abs(tangent.y) * 1.6) {
    normal = { x: 0, y: index % 2 ? 1 : -1 };
  } else if (Math.abs(tangent.y) > Math.abs(tangent.x) * 1.6) {
    normal = { x: index % 2 ? 1 : -1, y: 0 };
  } else {
    const candidate = { x: -tangent.y, y: tangent.x };
    normal = candidate.y < 0 ? candidate : scale(candidate, -1);
  }
  if (index === 0 && line.flipFirst) normal = scale(normal, -1);
  return placeLabel(pt, normal, radius);
}

function pillPlacement(line: Line, positions: number[], pointAt: (s: number) => Pt, tangentAt: (s: number) => Pt): PillPoint {
  const spec = line.pill;
  if ("x" in spec) return spec;
  const k = Math.min(Math.floor(spec.at), positions.length - 1);
  const next = Math.min(k + 1, positions.length - 1);
  const pos = positions[k] + (positions[next] - positions[k]) * (spec.at - k);
  const pt = pointAt(pos);
  const t = tangentAt(pos);
  if (spec.side === "left" || spec.side === "right") {
    const dir = spec.side === "left" ? -1 : 1;
    const offset = spec.offset ?? PILL_SIDE_OFFSET;
    return { x: pt.x + dir * offset, y: pt.y, anchor: spec.side === "left" ? "end" : "start" };
  }
  let normal = { x: -t.y, y: t.x };
  if ((spec.side === "above") !== normal.y < 0) normal = scale(normal, -1);
  const offset = spec.offset ?? PILL_OFFSET;
  return { x: pt.x + normal.x * offset, y: pt.y + normal.y * offset, anchor: "middle" };
}

const isThrough = (w: Waypoint): w is { through: string } => typeof w === "object" && !Array.isArray(w);

function referenced(line: Line): string[] {
  const ids = line.path.filter(isThrough).map((w) => w.through);
  if (line.from) ids.unshift(line.from);
  return ids;
}

function resolveWaypoints(line: Line, stations: Record<string, StationLayout>): Pt[] {
  const anchor = line.from ? stations[line.from].pt : null;
  const points = line.path.map((w) => {
    if (isThrough(w)) return stations[w.through].pt;
    const [x, y] = w;
    return anchor && line.relativePath ? { x: anchor.x + x, y: anchor.y + y } : { x, y };
  });
  if (anchor) points[0] = anchor;
  return points;
}

const DIAGONAL = Math.SQRT1_2;

function moveJunctionLabels(curriculum: Curriculum, stations: Record<string, StationLayout>) {
  for (const line of curriculum.lines) {
    for (const w of line.path) {
      if (!isThrough(w)) continue;
      const station = stations[w.through];
      const below = station.index % 2 === 1;
      station.label = placeLabel(station.pt, { x: DIAGONAL, y: below ? DIAGONAL : -DIAGONAL }, INTERCHANGE_RADIUS);
    }
    if (!line.from || line.closed) continue;
    const [a, b] = line.path;
    if (isThrough(a) || isThrough(b)) continue;
    const station = stations[line.from];
    const d = norm({ x: b[0] - (line.relativePath ? 0 : station.pt.x), y: b[1] - (line.relativePath ? 0 : station.pt.y) });
    let normal: Pt | null = null;
    if (Math.abs(d.y) > Math.abs(d.x) * 2) normal = { x: 0, y: -Math.sign(d.y) };
    else if (Math.abs(d.x) > Math.abs(d.y) * 2) normal = { x: -Math.sign(d.x), y: 0 };
    if (normal) station.label = placeLabel(station.pt, normal, INTERCHANGE_RADIUS);
  }
}

export function computeLayout(curriculum: Curriculum): MapLayout {
  const lines: Record<string, LineLayout> = {};
  const stations: Record<string, StationLayout> = {};
  const pills: Record<string, PillPoint> = {};
  const junctions = new Set(curriculum.lines.flatMap(referenced));
  const pending = [...curriculum.lines];

  while (pending.length) {
    const ready = pending.findIndex((line) => referenced(line).every((id) => stations[id]));
    if (ready === -1) throw new Error(`Unresolvable line anchors: ${pending.map((l) => l.id).join(", ")}`);
    const [line] = pending.splice(ready, 1);
    const waypoints = resolveWaypoints(line, stations);
    const built = buildPath(waypoints, Boolean(line.closed));
    const { pointAt, tangentAt } = makeSampler(built);
    const termini: Terminus[] = [];
    if (!line.closed) {
      const first = line.path[0];
      const last = line.path[line.path.length - 1];
      if (!line.from && !isThrough(first)) termini.push({ pt: pointAt(0), tangent: tangentAt(0), stationId: line.stations[0].id, outward: -1 });
      if (!isThrough(last)) termini.push({ pt: pointAt(built.length), tangent: tangentAt(built.length), stationId: line.stations[line.stations.length - 1].id, outward: 1 });
    }
    lines[line.id] = { id: line.id, d: built.d, length: built.length, pointAt, tangentAt, posOf: (pt) => nearestPos(built, pt), termini };

    const centroid = waypoints.reduce(
      (acc, p) => ({ x: acc.x + p.x / waypoints.length, y: acc.y + p.y / waypoints.length }),
      { x: 0, y: 0 },
    );
    const positions = stationPositions(line, built);
    pills[line.id] = pillPlacement(line, positions, pointAt, tangentAt);
    line.stations.forEach((station, index) => {
      const pos = positions[index];
      const pt = pointAt(pos);
      const tangent = tangentAt(pos);
      const interchange = junctions.has(station.id);
      const radius = interchange ? INTERCHANGE_RADIUS : STATION_RADIUS[station.tag];
      stations[station.id] = {
        id: station.id,
        lineId: line.id,
        index,
        pos,
        pt,
        tangent,
        label: labelFor(line, index, pt, tangent, centroid, radius),
        interchange,
      };
    });
  }
  moveJunctionLabels(curriculum, stations);
  return { lines, stations, pills };
}

export function lineBounds(line: Line, layout: MapLayout, margin = 150) {
  const pts = line.stations.map((s) => layout.stations[s.id].pt);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
  };
}

export interface IntroSchedule {
  lineStart: Record<string, number>;
  lineDuration: Record<string, number>;
  stationDelay: Record<string, number>;
  total: number;
}

const INTRO_SPEED = 2000;
const INTRO_LEAD = 400;

export function introSchedule(curriculum: Curriculum, layout: MapLayout): IntroSchedule {
  const lineStart: Record<string, number> = {};
  const lineDuration: Record<string, number> = {};
  const stationDelay: Record<string, number> = {};
  const passTime: Record<string, number> = {};

  const touch = (id: string, t: number) => { passTime[id] = Math.min(passTime[id] ?? Infinity, t); };
  const schedule = (line: Line, start: number) => {
    const l = layout.lines[line.id];
    lineStart[line.id] = start;
    lineDuration[line.id] = (l.length / INTRO_SPEED) * 1000;
    for (const station of line.stations) {
      const t = start + (layout.stations[station.id].pos / INTRO_SPEED) * 1000;
      stationDelay[station.id] = t;
      touch(station.id, t);
    }
    for (const w of line.path) {
      if (isThrough(w)) touch(w.through, start + (l.posOf(layout.stations[w.through].pt) / INTRO_SPEED) * 1000);
    }
  };

  const reachTime = (line: Line) => {
    if (line.from) return passTime[line.from] ?? Infinity;
    const times = line.stations.map((s) => passTime[s.id]).filter((t): t is number => t !== undefined);
    return times.length ? Math.min(...times) : Infinity;
  };
  const order = [
    ...curriculum.spineOrder.map((id) => curriculum.lines.find((l) => l.id === id)).filter((l): l is Line => Boolean(l)),
    ...curriculum.lines.filter((l) => !curriculum.spineOrder.includes(l.id)),
  ];
  let previous = INTRO_LEAD;
  order.forEach((line, i) => {
    const reached = reachTime(line);
    const start = i === 0 ? INTRO_LEAD : reached === Infinity ? previous + 400 : reached;
    schedule(line, start);
    previous = start;
  });
  const total = Math.max(...curriculum.lines.map((l) => lineStart[l.id] + lineDuration[l.id]));
  return { lineStart, lineDuration, stationDelay, total };
}

const ISLAND_CELL = 70;
const ISLAND_REACH = 3;
const LABEL_CHAR = 8.5;
const PILL_CHAR = 8;

interface Grid {
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  cells: Uint8Array;
}

function markFootprint(layout: MapLayout, curriculum: Curriculum, grid: Grid) {
  const { originX, originY, cols, rows, cells } = grid;
  const mark = (x: number, y: number) => {
    const i = Math.floor((x - originX) / ISLAND_CELL);
    const j = Math.floor((y - originY) / ISLAND_CELL);
    if (i >= 0 && j >= 0 && i < cols && j < rows) cells[j * cols + i] = 1;
  };
  const markRect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y += ISLAND_CELL / 2) for (let x = x0; x <= x1; x += ISLAND_CELL / 2) mark(x, y);
    mark(x1, y1);
  };
  const markText = (x: number, y: number, anchor: "start" | "middle" | "end", width: number, half: number) => {
    const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
    markRect(left, y - half, left + width, y + half);
  };
  for (const line of Object.values(layout.lines)) {
    for (let s = 0; s <= line.length; s += ISLAND_CELL / 2) { const p = line.pointAt(s); mark(p.x, p.y); }
  }
  for (const line of curriculum.lines) {
    for (const station of line.stations) {
      const { label } = layout.stations[station.id];
      markText(label.x, label.y, label.anchor, station.name.length * LABEL_CHAR, 14);
    }
    const pill = layout.pills[line.id];
    markText(pill.x, pill.y, pill.anchor, `${line.phase} · ${line.short}`.length * PILL_CHAR, 16);
  }
}

function discOffsets(radius: number): [number, number][] {
  const offsets: [number, number][] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) if (dx * dx + dy * dy <= radius * radius + 0.5) offsets.push([dx, dy]);
  }
  return offsets;
}

function morph(cols: number, rows: number, cells: Uint8Array, radius: number, grow: boolean): Uint8Array {
  const offsets = discOffsets(radius);
  const out = new Uint8Array(cells.length);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let hit = false;
      let all = true;
      for (const [dx, dy] of offsets) {
        const x = i + dx;
        const y = j + dy;
        const on = x >= 0 && y >= 0 && x < cols && y < rows && cells[y * cols + x] === 1;
        if (on) hit = true;
        else all = false;
      }
      out[j * cols + i] = grow ? Number(hit) : Number(all);
    }
  }
  return out;
}

function traceOuterLoop(cols: number, rows: number, cells: Uint8Array): Pt[] {
  const at = (i: number, j: number) => (i >= 0 && j >= 0 && i < cols && j < rows ? cells[j * cols + i] : 0);
  const key = (p: Pt) => `${p.x},${p.y}`;
  const outgoing = new Map<string, Pt[]>();
  const addEdge = (a: Pt, b: Pt) => {
    const list = outgoing.get(key(a)) ?? [];
    list.push(b);
    outgoing.set(key(a), list);
  };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!at(i, j)) continue;
      if (!at(i, j - 1)) addEdge({ x: i, y: j }, { x: i + 1, y: j });
      if (!at(i + 1, j)) addEdge({ x: i + 1, y: j }, { x: i + 1, y: j + 1 });
      if (!at(i, j + 1)) addEdge({ x: i + 1, y: j + 1 }, { x: i, y: j + 1 });
      if (!at(i - 1, j)) addEdge({ x: i, y: j + 1 }, { x: i, y: j });
    }
  }
  const loops: Pt[][] = [];
  const used = new Set<string>();
  for (const [startKey, targets] of outgoing) {
    for (const first of targets) {
      const edgeKey = `${startKey}>${key(first)}`;
      if (used.has(edgeKey)) continue;
      const [sx, sy] = startKey.split(",").map(Number);
      const loop: Pt[] = [{ x: sx, y: sy }];
      let prev = { x: sx, y: sy };
      let current = first;
      used.add(edgeKey);
      while (key(current) !== startKey) {
        loop.push(current);
        const options = (outgoing.get(key(current)) ?? []).filter((next) => !used.has(`${key(current)}>${key(next)}`));
        if (!options.length) break;
        const dir = { x: current.x - prev.x, y: current.y - prev.y };
        options.sort((a, b) => turn(dir, { x: b.x - current.x, y: b.y - current.y }) - turn(dir, { x: a.x - current.x, y: a.y - current.y }));
        const next = options[0];
        used.add(`${key(current)}>${key(next)}`);
        prev = current;
        current = next;
      }
      loops.push(loop);
    }
  }
  return loops.reduce((best, loop) => (Math.abs(polygonArea(loop)) > Math.abs(polygonArea(best)) ? loop : best), loops[0] ?? []);
}

const turn = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;

function polygonArea(pts: Pt[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function mergeCollinear(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n];
    const v = pts[i];
    const q = pts[(i + 1) % n];
    if (turn({ x: v.x - p.x, y: v.y - p.y }, { x: q.x - v.x, y: q.y - v.y }) !== 0) out.push(v);
  }
  return out;
}

function chamferSteps(pts: Pt[]): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n];
    const v = pts[i];
    const q = pts[(i + 1) % n];
    const a = Math.hypot(v.x - p.x, v.y - p.y);
    const b = Math.hypot(q.x - v.x, q.y - v.y);
    if (a <= 1 && b <= 1) {
      out.push({ x: (p.x + v.x) / 2, y: (p.y + v.y) / 2 }, { x: (v.x + q.x) / 2, y: (v.y + q.y) / 2 });
    } else {
      out.push(v);
    }
  }
  return mergeCollinear(out);
}

export interface RiverVertex extends Pt { w: number }

export interface RiverSpec {
  course: RiverVertex[];
  pool: { x: number; y: number; r: number };
  headland: { x: number; y: number; r: number };
}

export const RIVER: RiverSpec = {
  course: [
    { x: 1295, y: 2800, w: 760 },
    { x: 1295, y: 2600, w: 640 },
    { x: 1295, y: 2450, w: 460 },
    { x: 1295, y: 2330, w: 300 },
    { x: 1295, y: 2230, w: 180 },
    { x: 1295, y: 2160, w: 110 },
    { x: 1295, y: 2100, w: 70 },
    { x: 1295, y: 1780, w: 104 },
    { x: 1365, y: 1710, w: 104 },
    { x: 1365, y: 1520, w: 104 },
    { x: 1295, y: 1450, w: 104 },
    { x: 1295, y: 1160, w: 70 },
  ],
  pool: { x: 1295, y: 1160, r: 112 },
  headland: { x: 1295, y: 2330, r: 260 },
};

export interface Surface {
  island: string;
  islandPolygon: Pt[];
  coastPolygon: Pt[];
  river: string;
  riverPolygon: Pt[];
}

export interface Crossing {
  pt: Pt;
  tangent: Pt;
  lineId: string;
  into: boolean;
}

export interface Tunnel {
  lineId: string;
  d: string;
}

export interface WaveMark {
  d: string;
  nx: number;
  ny: number;
  delay: number;
  duration: number;
}

const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function offsetPolygon(polygon: Pt[], distance: number): Pt[] {
  const n = polygon.length;
  return polygon.map((v, i) => {
    const p = polygon[(i - 1 + n) % n];
    const q = polygon[(i + 1) % n];
    const e1 = norm(sub(v, p));
    const e2 = norm(sub(q, v));
    const n1 = { x: e1.y, y: -e1.x };
    const n2 = { x: e2.y, y: -e2.x };
    const miter = norm({ x: n1.x + n2.x, y: n1.y + n2.y });
    const scale = Math.min(2, 1 / Math.max(0.5, miter.x * n1.x + miter.y * n1.y));
    return { x: v.x + miter.x * distance * scale, y: v.y + miter.y * distance * scale };
  });
}

const WAVE_CELL = 25;
const WAVE_RING_STEPS = [1, 3, 5];
const WAVE_MARGIN_CELLS = 8;
export const WAVE_RINGS = WAVE_RING_STEPS.length;
const SECTOR_GAP = 40;
const MIN_WAVE = 120;
const END_CLEARANCE = 30;
const WAVE_AVOID = 40;

export function coastRings(coast: Pt[], bounds: { x: number; y: number; w: number; h: number }): Pt[][] {
  const margin = WAVE_CELL * WAVE_MARGIN_CELLS;
  const originX = bounds.x - margin;
  const originY = bounds.y - margin;
  const cols = Math.ceil((bounds.w + margin * 2) / WAVE_CELL);
  const rows = Math.ceil((bounds.h + margin * 2) / WAVE_CELL);
  const cells = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (insidePolygon({ x: originX + (i + 0.5) * WAVE_CELL, y: originY + (j + 0.5) * WAVE_CELL }, coast)) cells[j * cols + i] = 1;
    }
  }
  return WAVE_RING_STEPS.map((step) => {
    const grown = morph(cols, rows, cells, step, true);
    const loop = chamferSteps(mergeCollinear(traceOuterLoop(cols, rows, grown)));
    return loop.map((p) => ({ x: originX + p.x * WAVE_CELL, y: originY + p.y * WAVE_CELL }));
  });
}

interface ArcEdge { index: number; start: number; end: number }

function arcEdges(polygon: Pt[]): { edges: ArcEdge[]; perimeter: number } {
  const edges: ArcEdge[] = [];
  let cursor = 0;
  polygon.forEach((a, i) => {
    const length = len(sub(polygon[(i + 1) % polygon.length], a));
    edges.push({ index: i, start: cursor, end: cursor + length });
    cursor += length;
  });
  return { edges, perimeter: cursor };
}

function edgeAt(edges: ArcEdge[], perimeter: number, s: number): ArcEdge {
  const local = ((s % perimeter) + perimeter) % perimeter;
  return edges.find((e) => local >= e.start && local <= e.end) ?? edges[edges.length - 1];
}

function pointAt(polygon: Pt[], edges: ArcEdge[], perimeter: number, s: number): Pt {
  const local = ((s % perimeter) + perimeter) % perimeter;
  const edge = edgeAt(edges, perimeter, s);
  const a = polygon[edge.index];
  const b = polygon[(edge.index + 1) % polygon.length];
  const t = edge.end > edge.start ? Math.min(1, Math.max(0, (local - edge.start) / (edge.end - edge.start))) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function subPolyline(polygon: Pt[], s0: number, s1: number): Pt[] {
  const { edges, perimeter } = arcEdges(polygon);
  const first = edgeAt(edges, perimeter, s0);
  const last = edgeAt(edges, perimeter, s1);
  const points = [pointAt(polygon, edges, perimeter, s0)];
  if (first.index !== last.index || s1 - s0 > perimeter / 2) {
    for (let i = first.index + 1; i <= first.index + polygon.length; i++) {
      const idx = i % polygon.length;
      points.push(polygon[idx]);
      if (idx === last.index) break;
    }
  }
  points.push(pointAt(polygon, edges, perimeter, s1));
  const start = points[0];
  const finish = points[points.length - 1];
  return points.filter((p, i) => i === 0 || i === points.length - 1 || (len(sub(p, start)) >= END_CLEARANCE && len(sub(p, finish)) >= END_CLEARANCE));
}

function nearestArc(polygon: Pt[], edges: ArcEdge[], p: Pt): number {
  let best = 0;
  let bestDist = Infinity;
  edges.forEach((e) => {
    const a = polygon[e.index];
    const b = polygon[(e.index + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d < bestDist) { bestDist = d; best = e.start + t * (e.end - e.start); }
  });
  return best;
}

export function coastWaves(rings: Pt[][], slots: number, variants: number, avoid: Pt[], seed = 7): WaveMark[][] {
  const rand = seededRandom(seed);
  const keepOut = offsetPolygon(avoid, WAVE_AVOID);
  const inner = rings[0];
  if (!inner?.length) return [];
  const { edges: innerEdges, perimeter } = arcEdges(inner);
  const outerEdges = rings.map((ring) => arcEdges(ring));
  return Array.from({ length: slots * variants }, (_, k) => {
    const slot = Math.floor(k / variants);
    const lo = (slot / slots) * perimeter;
    const hi = ((slot + 1) / slots) * perimeter;
    const length = 260 + rand() * 180;
    const delay = -rand() * 7;
    const duration = 5 + rand() * 2.5;
    const centre = lo + ((k % variants + rand()) / variants) * (hi - lo);
    const s0 = Math.max(lo + SECTOR_GAP, centre - length / 2);
    const s1 = Math.min(hi - SECTOR_GAP, s0 + length);
    if (s1 - s0 < MIN_WAVE) return [];
    const first = subPolyline(inner, s0, s1);
    const others = rings.slice(1).map((ring, i) => {
      const { edges, perimeter: p } = outerEdges[i + 1];
      const a0 = nearestArc(ring, edges, first[0]);
      const a1 = nearestArc(ring, edges, first[first.length - 1]);
      const forward = ((a1 - a0) % p + p) % p;
      if (forward > p / 2 || forward < MIN_WAVE * 0.6) return null;
      return subPolyline(ring, a0, a0 + forward);
    });
    if (others.some((o) => !o)) return [];
    const all = [first, ...(others as Pt[][])];
    if (all.some((pts) => pts.some((p) => insidePolygon(p, keepOut)))) return [];
    const midEdge = edgeAt(innerEdges, perimeter, (s0 + s1) / 2);
    const dir = norm(sub(inner[(midEdge.index + 1) % inner.length], inner[midEdge.index]));
    const normal = { x: dir.y, y: -dir.x };
    return all.map((pts) => ({ d: buildPath(pts, false).d, nx: normal.x * 26, ny: normal.y * 26, delay, duration }));
  });
}


function riverMask(grid: Grid, spec: RiverSpec): Uint8Array {
  const { originX, originY, cols, rows } = grid;
  const out = new Uint8Array(cols * rows);
  const { course, pool } = spec;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = originX + (i + 0.5) * ISLAND_CELL;
      const y = originY + (j + 0.5) * ISLAND_CELL;
      let wet = Math.hypot(x - pool.x, y - pool.y) <= pool.r;
      for (let k = 0; k < course.length - 1 && !wet; k++) {
        const a = course[k];
        const b = course[k + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        const w = a.w + (b.w - a.w) * t;
        wet = Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)) <= w / 2 + 1;
      }
      if (wet) out[j * cols + i] = 1;
    }
  }
  return out;
}

function outlinePath(grid: Grid, cells: Uint8Array): { d: string; polygon: Pt[] } {
  const loop = chamferSteps(mergeCollinear(traceOuterLoop(grid.cols, grid.rows, cells)));
  const polygon = loop.map((p) => ({ x: grid.originX + p.x * ISLAND_CELL, y: grid.originY + p.y * ISLAND_CELL }));
  return { d: polygon.length ? buildPath(polygon, true).d : "", polygon };
}

export function surfaceGeometry(layout: MapLayout, curriculum: Curriculum, bounds: { x: number; y: number; w: number; h: number }, river: RiverSpec): Surface {
  const margin = ISLAND_CELL * (ISLAND_REACH + 3);
  const grid: Grid = {
    originX: bounds.x - margin,
    originY: bounds.y - margin,
    cols: Math.ceil((bounds.w + margin * 2) / ISLAND_CELL),
    rows: Math.ceil((bounds.h + margin * 2) / ISLAND_CELL),
    cells: new Uint8Array(0),
  };
  grid.cells = new Uint8Array(grid.cols * grid.rows);
  markFootprint(layout, curriculum, grid);
  for (let j = 0; j < grid.rows; j++) {
    for (let i = 0; i < grid.cols; i++) {
      const x = grid.originX + (i + 0.5) * ISLAND_CELL;
      const y = grid.originY + (j + 0.5) * ISLAND_CELL;
      if (Math.hypot(x - river.headland.x, y - river.headland.y) <= river.headland.r) grid.cells[j * grid.cols + i] = 1;
    }
  }
  const grown = morph(grid.cols, grid.rows, grid.cells, ISLAND_REACH, true);
  const land = morph(grid.cols, grid.rows, morph(grid.cols, grid.rows, grown, 1, true), 1, false);
  const wet = riverMask(grid, river);
  const coast = outlinePath(grid, land);
  const riverCells = new Uint8Array(land.length);
  for (let i = 0; i < land.length; i++) {
    if (land[i] && wet[i]) { riverCells[i] = 1; land[i] = 0; }
  }
  const island = outlinePath(grid, land);
  const channel = outlinePath(grid, riverCells);
  return { island: island.d, islandPolygon: island.polygon, coastPolygon: coast.polygon, river: channel.d, riverPolygon: channel.polygon };
}

function insidePolygon(p: Pt, polygon: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function riverCrossings(layout: MapLayout, polygon: Pt[]): { portals: Crossing[]; tunnels: Tunnel[] } {
  const portals: Crossing[] = [];
  const tunnels: Tunnel[] = [];
  for (const line of Object.values(layout.lines)) {
    let inside = false;
    let entered = 0;
    for (let s = 0; s <= line.length; s += 3) {
      const pt = line.pointAt(s);
      const now = insidePolygon(pt, polygon);
      if (now === inside) continue;
      portals.push({ pt, tangent: line.tangentAt(s), lineId: line.id, into: now });
      if (now) entered = s;
      else {
        const pts: Pt[] = [];
        for (let t = entered; t <= s; t += 6) pts.push(line.pointAt(t));
        pts.push(pt);
        tunnels.push({ lineId: line.id, d: `M ${pts.map(fmt).join(" L ")}` });
      }
      inside = now;
    }
  }
  return { portals, tunnels };
}
