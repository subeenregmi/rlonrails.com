import { findStation, resourceIds, stationIds, type Curriculum, type Line, type Resource, type Station } from "./curriculum";
import type { MapLayout } from "./geometry";

export type Status = "unread" | "reading" | "read";

export interface StationProgress {
  status: Status;
  readAt: string | null;
  updatedAt: string | null;
}

export interface Progress {
  stations: Record<string, StationProgress>;
  resources: Record<string, boolean>;
}

export const STATUSES: Status[] = ["unread", "reading", "read"];

export const emptyProgress = (): Progress => ({ stations: {}, resources: {} });

export const emptyStation = (): StationProgress => ({ status: "unread", readAt: null, updatedAt: null });

export const stationProgress = (progress: Progress, id: string): StationProgress =>
  progress.stations[id] ?? emptyStation();

export const statusOf = (progress: Progress, id: string): Status => stationProgress(progress, id).status;

export const isRead = (progress: Progress, id: string) => statusOf(progress, id) === "read";

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

export function statusFromResources(station: Station, resources: Record<string, boolean>): Status {
  if (!station.resources.some((r) => resources[r.id])) return "unread";
  return requirement(station, resources).met ? "read" : "reading";
}

export function isValidProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Progress>;
  if (!candidate.stations || typeof candidate.stations !== "object") return false;
  if (!candidate.resources || typeof candidate.resources !== "object") return false;
  return Object.values(candidate.stations).every(
    (s) => s && typeof s === "object" && STATUSES.includes((s as StationProgress).status),
  );
}

const validDate = (value: unknown): string | null => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null);

export function sanitizeProgress(curriculum: Curriculum, progress: Progress): Progress {
  const stations = stationIds(curriculum);
  const resources = resourceIds(curriculum);
  const clean = emptyProgress();
  for (const [id, station] of Object.entries(progress.stations)) {
    if (!stations.has(id)) continue;
    clean.stations[id] = {
      status: station.status,
      readAt: validDate(station.readAt),
      updatedAt: validDate(station.updatedAt),
    };
  }
  for (const [id, done] of Object.entries(progress.resources)) if (resources.has(id) && done === true) clean.resources[id] = true;
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
  complete: boolean;
}

export function lineProgress(line: Line, progress: Progress): LineProgress {
  let read = 0;
  let reading = 0;
  for (const station of line.stations) {
    const status = statusOf(progress, station.id);
    if (status === "read") read++;
    else if (status === "reading") reading++;
  }
  return { read, reading, total: line.stations.length, complete: read === line.stations.length };
}

export const nextOnLine = (line: Line, progress: Progress) =>
  line.stations.find((s) => !isRead(progress, s.id)) ?? null;

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

function onwardFrom(curriculum: Curriculum, stationId: string, progress: Progress): Station | null {
  const found = findStation(curriculum, stationId);
  if (!found) return null;
  const index = found.line.stations.indexOf(found.station);
  return found.line.stations.slice(index + 1).find((s) => !isRead(progress, s.id)) ?? null;
}

export function nextStop(curriculum: Curriculum, progress: Progress): Station | null {
  const readingId = latestWithStatus(progress, "reading", (s) => s.updatedAt);
  const reading = readingId ? findStation(curriculum, readingId)?.station : null;
  if (reading) return reading;
  const lastReadId = latestWithStatus(progress, "read", (s) => s.readAt);
  const onward = lastReadId ? onwardFrom(curriculum, lastReadId, progress) : null;
  if (onward) return onward;
  for (const lineId of curriculum.spineOrder) {
    const line = curriculum.lines.find((l) => l.id === lineId);
    if (!line) continue;
    const candidate = line.stations.find(
      (s) => !isRead(progress, s.id) && (s.tag === "essential" || s.tag === "project"),
    );
    if (candidate) return candidate;
  }
  for (const line of curriculum.lines) {
    const candidate = nextOnLine(line, progress);
    if (candidate) return candidate;
  }
  return null;
}

export interface Totals {
  read: number;
  reading: number;
  total: number;
  essentialRead: number;
  essentialTotal: number;
  projectRead: number;
  projectTotal: number;
  resourcesDone: number;
  resourcesTotal: number;
}

export function totals(curriculum: Curriculum, progress: Progress): Totals {
  const t: Totals = {
    read: 0, reading: 0, total: 0, essentialRead: 0, essentialTotal: 0,
    projectRead: 0, projectTotal: 0, resourcesDone: 0, resourcesTotal: 0,
  };
  for (const line of curriculum.lines) {
    for (const station of line.stations) {
      const status = statusOf(progress, station.id);
      const read = status === "read";
      t.total++;
      if (read) t.read++;
      if (status === "reading") t.reading++;
      if (station.tag === "essential") { t.essentialTotal++; if (read) t.essentialRead++; }
      if (station.tag === "project") { t.projectTotal++; if (read) t.projectRead++; }
      for (const resource of station.resources) {
        t.resourcesTotal++;
        if (progress.resources[resource.id]) t.resourcesDone++;
      }
    }
  }
  return t;
}
