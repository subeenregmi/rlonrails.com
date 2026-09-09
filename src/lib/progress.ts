import { findStation, resourceIds, stationIds, type Curriculum, type Line, type Resource, type Station } from "./curriculum";
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
}

export const STATUSES: Status[] = ["unread", "reading", "read"];
export const SKILLS: Skill[] = ["understood", "implemented", "investigated"];
const RANK: Record<Status, number> = { unread: 0, reading: 1, read: 2 };

export const emptyProgress = (): Progress => ({ stations: {}, resources: {}, tracks: [] });

export const emptyStation = (): StationProgress => ({ status: "unread", readAt: null, updatedAt: null, skills: [], deliverables: [] });

export const stationProgress = (progress: Progress, id: string): StationProgress =>
  progress.stations[id] ?? emptyStation();

export const statusOf = (progress: Progress, id: string): Status => stationProgress(progress, id).status;

export const isRead = (progress: Progress, id: string) => statusOf(progress, id) === "read";

export const hasSkill = (progress: Progress, id: string, skill: Skill) => stationProgress(progress, id).skills.includes(skill);

export const isExercise = (station: Station) => station.tag === "exercise";

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

export function routeIds(curriculum: Curriculum, tracks: string[]): Set<string> {
  const ids = new Set<string>();
  for (const line of curriculum.lines) for (const station of line.stations) if (isOnRoute(station, line, tracks)) ids.add(station.id);
  return ids;
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

export const nextOnLine = (line: Line, progress: Progress) =>
  line.stations.find((s) => !isRead(progress, s.id) && isOnRoute(s, line, progress.tracks))
  ?? line.stations.find((s) => !isRead(progress, s.id))
  ?? null;

export const prereqsMet = (station: Station, progress: Progress) =>
  (station.prereqs ?? []).every((id) => isRead(progress, id));

export const missingPrereqs = (curriculum: Curriculum, station: Station, progress: Progress): Station[] =>
  (station.prereqs ?? [])
    .filter((id) => !isRead(progress, id))
    .map((id) => findStation(curriculum, id)?.station)
    .filter((s): s is Station => Boolean(s));

function latestWithStatus(progress: Progress, status: Status, stampOf: (s: StationProgress) => string | null): string | null {
  let bestId: string | null = null;
  let bestStamp = "";
  for (const [id, station] of Object.entries(progress.stations)) {
    if (station.status !== status) continue;
    const stamp = stampOf(station) ?? "";
    if (bestId !== null && stamp < bestStamp) continue;
    bestId = id;
    bestStamp = stamp;
  }
  return bestId;
}

function onwardFrom(curriculum: Curriculum, stationId: string, progress: Progress, ready: boolean): Station | null {
  const found = findStation(curriculum, stationId);
  if (!found) return null;
  const index = found.line.stations.indexOf(found.station);
  return found.line.stations
    .slice(index + 1)
    .find((s) => !isRead(progress, s.id) && isOnRoute(s, found.line, progress.tracks) && (!ready || prereqsMet(s, progress)))
    ?? null;
}

/**
 * The next stop on the selected route: carry on down the current line where the
 * route does, otherwise take the first station the spine order offers whose
 * prerequisites are met. Off-route detours are never recommended, only reachable.
 */
export function nextStop(curriculum: Curriculum, progress: Progress): Station | null {
  const readingId = latestWithStatus(progress, "reading", (s) => s.updatedAt);
  const reading = readingId ? findStation(curriculum, readingId) : null;
  if (reading && isOnRoute(reading.station, reading.line, progress.tracks)) return reading.station;

  const lastReadId = latestWithStatus(progress, "read", (s) => s.readAt);
  const onward = lastReadId ? onwardFrom(curriculum, lastReadId, progress, true) : null;
  if (onward) return onward;

  const scan = (ready: boolean) => {
    for (const lineId of curriculum.spineOrder) {
      const line = curriculum.lines.find((l) => l.id === lineId);
      const candidate = line?.stations.find(
        (s) => !isRead(progress, s.id) && isOnRoute(s, line, progress.tracks) && (!ready || prereqsMet(s, progress)),
      );
      if (candidate) return candidate;
    }
    return null;
  };
  return scan(true) ?? scan(false) ?? (reading?.station ?? null) ?? curriculum.lines.flatMap((l) => l.stations).find((s) => !isRead(progress, s.id)) ?? null;
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
    exerciseRead: 0, exerciseTotal: 0, routeRead: 0, routeTotal: 0, implemented: 0, investigated: 0,
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
