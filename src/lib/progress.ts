import { findStation, resourceIds, stationIds, type Curriculum, type Line, type Resource, type Stage, type Station } from "./curriculum";
import type { MapLayout } from "./geometry";

export type Status = "unread" | "reading" | "read";

/**
 * Three things you can demonstrate about a station, tracked separately: you can
 * understand an algorithm without implementing it, and implementing it does not
 * mean you can weigh up the claims made for it.
 */
export type Skill = "understood" | "implemented" | "investigated";

export interface StationProgress {
  status: Status;
  readAt: string | null;
  updatedAt: string | null;
  skills: Skill[];
  deliverables: string[];
}

export interface Progress {
  stations: Record<string, StationProgress>;
  resources: Record<string, boolean>;
  /** Selected specialisations. Track stations on other lines stay off the route. */
  tracks: string[];
  /**
   * When the reader last settled their specialisations. Null while they have
   * never been asked, which is what brings the picker up of its own accord.
   */
  tracksAt: string | null;
}

export const STATUSES: Status[] = ["unread", "reading", "read"];
export const SKILLS: Skill[] = ["understood", "implemented", "investigated"];
const RANK: Record<Status, number> = { unread: 0, reading: 1, read: 2 };

export const emptyProgress = (): Progress => ({ stations: {}, resources: {}, tracks: [], tracksAt: null });

export const emptyStation = (): StationProgress => ({ status: "unread", readAt: null, updatedAt: null, skills: [], deliverables: [] });

export const stationProgress = (progress: Progress, id: string): StationProgress =>
  progress.stations[id] ?? emptyStation();

export const statusOf = (progress: Progress, id: string): Status => stationProgress(progress, id).status;

export const isRead = (progress: Progress, id: string) => statusOf(progress, id) === "read";

const isExercise = (station: Station) => station.tag === "exercise";

/**
 * Core stations are for everyone. Everything else on a specialisation line — its
 * track stations and its exercises alike — only counts once you have picked that
 * line. Reference material is never on the route; you go and get it when a project
 * asks for it.
 */
export function isOnRoute(station: Station, line: Line, tracks: string[]): boolean {
  if (station.tag === "reference") return false;
  if (station.tag === "core" || station.always) return true;
  return !line.track || tracks.includes(line.id);
}

export interface Requirement {
  required: { done: number; total: number };
  pick: { done: number; need: number; total: number };
  optional: { done: number; total: number };
  met: boolean;
}

export function requirement(station: Station, resources: Record<string, boolean>): Requirement {
  const count = (list: Resource[]) => ({ done: list.filter((r) => resources[r.id]).length, total: list.length });
  const required = count(station.resources.filter((r) => !r.role));
  const picks = station.resources.filter((r) => r.role === "pick");
  const pick = { ...count(picks), need: Math.min(station.pick ?? 1, picks.length) };
  const optional = count(station.resources.filter((r) => r.role === "optional"));
  return { required, pick, optional, met: required.done === required.total && pick.done >= pick.need };
}

export interface Deliverables {
  done: number;
  total: number;
  met: boolean;
}

export function deliverables(station: Station, done: string[]): Deliverables {
  const total = station.deliverables?.length ?? 0;
  const count = station.deliverables?.filter((d) => done.includes(d.id)).length ?? 0;
  return { done: count, total, met: total > 0 && count === total };
}

/**
 * Reading stations are suggested by their resources, exercise stations by their
 * deliverables. Neither can pull a station back down: what you have understood is
 * yours to declare, and the tick boxes only ever push it forwards.
 */
export function suggestStatus(station: Station, progress: Progress, resources: Record<string, boolean>, done: string[]): Status {
  const current = statusOf(progress, station.id);
  const suggested = isExercise(station) ? statusFromDeliverables(station, done) : statusFromResources(station, resources);
  return RANK[suggested] > RANK[current] ? suggested : current;
}

export function statusFromResources(station: Station, resources: Record<string, boolean>): Status {
  if (!station.resources.some((r) => resources[r.id])) return "unread";
  return requirement(station, resources).met ? "read" : "reading";
}

export function statusFromDeliverables(station: Station, done: string[]): Status {
  const d = deliverables(station, done);
  if (d.done === 0) return "unread";
  return d.met ? "read" : "reading";
}

const isStatus = (value: unknown): value is Status => STATUSES.includes(value as Status);

export function isValidProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Progress>;
  if (!candidate.stations || typeof candidate.stations !== "object") return false;
  if (!candidate.resources || typeof candidate.resources !== "object") return false;
  if (candidate.tracks !== undefined && !Array.isArray(candidate.tracks)) return false;
  if (candidate.tracksAt !== undefined && candidate.tracksAt !== null && typeof candidate.tracksAt !== "string") return false;
  return Object.values(candidate.stations).every((s) => s && typeof s === "object" && isStatus((s as StationProgress).status));
}

const validDate = (value: unknown): string | null => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null);
const strings = (value: unknown, allowed?: (v: string) => boolean): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && (!allowed || allowed(v))) : [];

export function sanitizeProgress(curriculum: Curriculum, progress: Progress): Progress {
  const stations = stationIds(curriculum);
  const resources = resourceIds(curriculum);
  const trackLines = new Set(curriculum.lines.filter((l) => l.track).map((l) => l.id));
  const clean = emptyProgress();
  for (const [id, station] of Object.entries(progress.stations)) {
    if (!stations.has(id)) continue;
    const found = findStation(curriculum, id);
    const ids = new Set(found?.station.deliverables?.map((d) => d.id) ?? []);
    clean.stations[id] = {
      status: station.status,
      readAt: validDate(station.readAt),
      updatedAt: validDate(station.updatedAt),
      skills: strings(station.skills, (s) => SKILLS.includes(s as Skill)) as Skill[],
      deliverables: strings(station.deliverables, (d) => ids.has(d)),
    };
  }
  for (const [id, done] of Object.entries(progress.resources)) if (resources.has(id) && done === true) clean.resources[id] = true;
  clean.tracks = [...new Set(strings(progress.tracks, (id) => trackLines.has(id)))];
  clean.tracksAt = validDate(progress.tracksAt);
  return clean;
}

export type Interval = [number, number];

export function readIntervals(line: Line, layout: MapLayout, progress: Progress): Interval[] {
  const lineLayout = layout.lines[line.id];
  const count = line.stations.length;
  const out: Interval[] = [];
  line.stations.forEach((station, i) => {
    if (!isRead(progress, station.id)) return;
    const pos = layout.stations[station.id].pos;
    if (i < count - 1) {
      out.push([pos, layout.stations[line.stations[i + 1].id].pos]);
    } else if (line.closed) {
      out.push([pos, lineLayout.length], [0, layout.stations[line.stations[0].id].pos]);
    }
  });
  return out.sort((a, b) => a[0] - b[0]);
}

export function dashArray(intervals: Interval[], total: number): string {
  const parts = [0];
  let cursor = 0;
  for (const [a, b] of intervals) {
    parts.push(Math.max(0, a - cursor), Math.max(0, b - Math.max(a, cursor)));
    cursor = Math.max(cursor, b);
  }
  parts.push(total * 2);
  return parts.map((v) => v.toFixed(1)).join(" ");
}

export interface LineProgress {
  read: number;
  reading: number;
  total: number;
  /** Stations on this line that the selected route asks for. */
  routeRead: number;
  routeTotal: number;
  /** The route through this line is done. Everything read is `explored`. */
  complete: boolean;
  explored: boolean;
}

export function lineProgress(line: Line, progress: Progress): LineProgress {
  let read = 0;
  let reading = 0;
  let routeRead = 0;
  let routeTotal = 0;
  for (const station of line.stations) {
    const status = statusOf(progress, station.id);
    if (status === "read") read++;
    else if (status === "reading") reading++;
    if (!isOnRoute(station, line, progress.tracks)) continue;
    routeTotal++;
    if (status === "read") routeRead++;
  }
  return {
    read, reading, total: line.stations.length, routeRead, routeTotal,
    complete: routeTotal > 0 && routeRead === routeTotal,
    explored: read === line.stations.length,
  };
}

/**
 * What a line's row in a list should say. One denominator per row: the route
 * where the route asks anything of the line, the whole line where it asks
 * nothing. The count, the bar and the tick all read off it, so a row can no
 * longer show "3 / 5" above a bar three eighths full, or print the same
 * fraction twice because the count fell back to the numbers the note already
 * carried. Anything read outside that denominator is said in words instead.
 */
export interface LineTally {
  done: number;
  need: number;
  complete: boolean;
  /** 0..1, so the bar and the count cannot disagree. */
  fraction: number;
  /** What the count leaves out, in words rather than a second fraction. */
  note: string;
  title: string;
}

export function lineTally(p: LineProgress): LineTally {
  const onRoute = p.routeTotal > 0;
  const done = onRoute ? p.routeRead : p.read;
  const need = onRoute ? p.routeTotal : p.total;
  // Stations off the route, and how many of them have been read anyway.
  const off = p.total - p.routeTotal;
  const extra = onRoute ? p.read - p.routeRead : 0;
  return {
    done,
    need,
    complete: onRoute ? p.complete : p.explored,
    fraction: need > 0 ? done / need : 0,
    note: !onRoute ? "not on your route" : off === 0 ? "" : extra > 0 ? `${extra} of ${off} explored off route` : `${off} more off route`,
    title: onRoute
      ? `${p.routeRead} of ${p.routeTotal} on your route · ${p.read} of ${p.total} read on the line`
      : `Nothing on this line is on your route · ${p.read} of ${p.total} read on the line`,
  };
}

export const nextOnLine = (line: Line, progress: Progress) =>
  line.stations.find((s) => !isRead(progress, s.id) && isOnRoute(s, line, progress.tracks))
  ?? line.stations.find((s) => !isRead(progress, s.id))
  ?? null;

/**
 * Whether a stage's stations are behind the reader, judged on the route
 * everyone rides. Their own selections stay out of it: picking one of the
 * stage's lines would otherwise put unread stops inside the stage and take the
 * question away halfway through answering it.
 */
function stageComplete(curriculum: Curriculum, stage: Stage, progress: Progress): boolean {
  return stage.lines.every((id) => {
    const line = curriculum.lines.find((l) => l.id === id);
    return !line || line.stations.every((s) => !isOnRoute(s, line, []) || isRead(progress, s.id));
  });
}

/**
 * Whether it is time to ask which specialisations the reader wants: the stage
 * the curriculum marks as the point of choice is behind them, and they have not
 * settled the question yet. Everything up to there is the same route for
 * everyone, which is exactly why the choice can wait until then.
 */
export const chooseDue = (curriculum: Curriculum, progress: Progress): boolean =>
  progress.tracksAt === null && curriculum.stages.some((stage) => stage.choose && stageComplete(curriculum, stage, progress));

/** How many stops picking a specialisation would add to the route. */
export const trackStops = (line: Line): number =>
  line.stations.filter((s) => isOnRoute(s, line, [line.id]) && !isOnRoute(s, line, [])).length;

export const prereqsMet = (station: Station, progress: Progress) =>
  (station.prereqs ?? []).every((id) => isRead(progress, id));

export const missingPrereqs = (curriculum: Curriculum, station: Station, progress: Progress): Station[] =>
  (station.prereqs ?? [])
    .filter((id) => !isRead(progress, id))
    .map((id) => findStation(curriculum, id)?.station)
    .filter((s): s is Station => Boolean(s));

interface Stop {
  station: Station;
  line: Line;
}

/**
 * The ride: every stop the selected route asks for, line by line in spine order.
 * One list to walk, rather than a fresh scan of the whole map each time a line
 * runs out.
 */
function ride(curriculum: Curriculum, tracks: string[]): Stop[] {
  const place = (line: Line) => {
    const at = curriculum.spineOrder.indexOf(line.id);
    return at === -1 ? curriculum.spineOrder.length : at;
  };
  return [...curriculum.lines]
    .sort((a, b) => place(a) - place(b))
    .flatMap((line) => line.stations.filter((s) => isOnRoute(s, line, tracks)).map((station) => ({ station, line })));
}

/**
 * How far along the ride the reader has got: the stop they finished most
 * recently. Later stops win a tie, so an import — where every station can share
 * one timestamp — leaves them at the far end of what they have read rather than
 * wherever the file happened to list first.
 */
function positionOf(stops: Stop[], progress: Progress): number {
  let at = 0;
  let last = "";
  stops.forEach((stop, index) => {
    const entry = progress.stations[stop.station.id];
    if (entry?.status !== "read" || (entry.readAt ?? "") < last) return;
    at = index;
    last = entry.readAt ?? "";
  });
  return at;
}

/**
 * The next stop on the selected route, from wherever the reader last got to:
 * on down the line they are on, back for anything left behind on it, and only
 * then across to the next line. The marker moves along the route a stop at a
 * time instead of hopping about the map, and a route with nothing left has no
 * next stop at all — off-route stations are never recommended.
 */
export function nextStop(curriculum: Curriculum, progress: Progress): Station | null {
  const stops = ride(curriculum, progress.tracks);
  const at = positionOf(stops, progress);
  const lineId = stops[at]?.line.id;
  const unread = (stop: Stop) => !isRead(progress, stop.station.id);
  const ready = (stop: Stop) => unread(stop) && prereqsMet(stop.station, progress);
  const onward = stops.slice(at);
  const passed = stops.slice(0, at);
  const thisLine = (list: Stop[]) => list.filter((stop) => stop.line.id === lineId);
  const stop = thisLine(onward).find(ready) ?? thisLine(passed).find(ready)
    ?? onward.find(ready) ?? passed.find(ready)
    ?? onward.find(unread) ?? passed.find(unread);
  return stop?.station ?? null;
}

export interface Totals {
  read: number;
  reading: number;
  total: number;
  coreRead: number;
  coreTotal: number;
  trackRead: number;
  trackTotal: number;
  exerciseRead: number;
  exerciseTotal: number;
  /** Never on any route, so the route count and the map count differ by these. */
  referenceRead: number;
  referenceTotal: number;
  routeRead: number;
  routeTotal: number;
  implemented: number;
  investigated: number;
  resourcesDone: number;
  resourcesTotal: number;
}

export function totals(curriculum: Curriculum, progress: Progress): Totals {
  const t: Totals = {
    read: 0, reading: 0, total: 0, coreRead: 0, coreTotal: 0, trackRead: 0, trackTotal: 0,
    exerciseRead: 0, exerciseTotal: 0, referenceRead: 0, referenceTotal: 0, routeRead: 0, routeTotal: 0, implemented: 0, investigated: 0,
    resourcesDone: 0, resourcesTotal: 0,
  };
  for (const line of curriculum.lines) {
    for (const station of line.stations) {
      const progressFor = stationProgress(progress, station.id);
      const read = progressFor.status === "read";
      t.total++;
      if (read) t.read++;
      if (progressFor.status === "reading") t.reading++;
      if (progressFor.skills.includes("implemented")) t.implemented++;
      if (progressFor.skills.includes("investigated")) t.investigated++;
      if (station.tag === "core") { t.coreTotal++; if (read) t.coreRead++; }
      if (station.tag === "exercise") { t.exerciseTotal++; if (read) t.exerciseRead++; }
      if (station.tag === "reference") { t.referenceTotal++; if (read) t.referenceRead++; }
      if (station.tag === "track" && isOnRoute(station, line, progress.tracks)) { t.trackTotal++; if (read) t.trackRead++; }
      if (isOnRoute(station, line, progress.tracks)) { t.routeTotal++; if (read) t.routeRead++; }
      for (const resource of station.resources) {
        t.resourcesTotal++;
        if (progress.resources[resource.id]) t.resourcesDone++;
      }
    }
  }
  return t;
}
