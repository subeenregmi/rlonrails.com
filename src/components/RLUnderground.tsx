"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CURRICULUM, findLine, findResource, findStation, logResources, type Line, type Station } from "@/lib/curriculum";
import { computeLayout, introSchedule } from "@/lib/geometry";
import {
  emptyProgress, isRead, isValidProgress, lineProgress, nextOnLine, nextStop, sanitizeProgress, stationProgress, statusFromResources, totals,
  type Progress, type StationProgress, type Status,
} from "@/lib/progress";
import { cx } from "@/lib/cx";
import { TFL_COLOURS } from "@/lib/tfl";
import { JourneyStrip } from "./JourneyStrip";
import { StationPanel, type Connection } from "./StationPanel";
import { Toast, type ToastMessage } from "./Toast";
import { Dialog, type DialogMessage } from "./Dialog";
import { progressStore, saveProgress } from "@/lib/storage";
import { readDays } from "@/lib/activity";
import { JourneyModal } from "./Journey";
import { FloatingBar } from "./FloatingBar";
import { TubeMap, type TubeMapHandle } from "./TubeMap";


export const trainCountFor = (readStations: number) => (readStations > 0 ? Math.min(22, 2 + Math.floor(readStations / 4)) : 0);

function Tracker({ initialProgress }: { initialProgress: Progress }) {
  const layout = useMemo(() => computeLayout(CURRICULUM), []);
  const schedule = useMemo(() => introSchedule(CURRICULUM, layout), [layout]);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverLineId, setHoverLineId] = useState<string | null>(null);
  const [pinnedLineId, setPinnedLineId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dialog, setDialog] = useState<DialogMessage | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const closeJourney = useCallback(() => setJourneyOpen(false), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [saveError, setSaveError] = useState(false);
  const [intro, setIntro] = useState(true);
  const mapRef = useRef<TubeMapHandle>(null);
  const colours = useMemo(() => Object.fromEntries(CURRICULUM.lines.map((l) => [l.id, TFL_COLOURS[l.tfl]])), []);

  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), schedule.total + 1500);
    return () => clearTimeout(timer);
  }, [schedule.total]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const focusLineId = hoverLineId ?? pinnedLineId;
  const selected = selectedId ? findStation(CURRICULUM, selectedId) : null;
  const pinnedLine = pinnedLineId ? findLine(CURRICULUM, pinnedLineId) ?? null : null;
  const progressByLine = useMemo(() => Object.fromEntries(CURRICULUM.lines.map((l) => [l.id, lineProgress(l, progress)])), [progress]);
  const sums = useMemo(() => totals(CURRICULUM, progress), [progress]);
  const next = useMemo(() => {
    const station = nextStop(CURRICULUM, progress);
    return station ? findStation(CURRICULUM, station.id) : null;
  }, [progress]);
  const nextIds = useMemo(() => Object.fromEntries(CURRICULUM.lines.map((line) => [line.id, nextOnLine(line, progress)?.id ?? null])), [progress]);
  const trainCount = trainCountFor(sums.read);
  const days = useMemo(() => readDays(progress), [progress]);
  const log = useMemo(() => (selected ? logResources(CURRICULUM, selected.station.id) : []), [selected]);
  const completeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of CURRICULUM.lines) {
      for (const station of line.stations) {
        const entries = logResources(CURRICULUM, station.id);
        if (entries.length === 0) continue;
        const all = [...station.resources, ...entries.map((e) => e.resource)];
        if (all.every((r) => progress.resources[r.id])) ids.add(station.id);
      }
    }
    return ids;
  }, [progress]);

  const persist = useCallback((next: Progress) => {
    try {
      saveProgress(next);
      setSaveError(false);
    } catch (error) {
      console.error("save failed", error);
      setSaveError(true);
    }
  }, []);

  const applyStation = useCallback((station: Station, line: Line, nextValue: StationProgress, resources?: Record<string, boolean>) => {
    const current = progressRef.current;
    const merged: Progress = {
      stations: { ...current.stations, [station.id]: { ...nextValue, updatedAt: new Date().toISOString() } },
      resources: { ...current.resources },
    };
    for (const [id, done] of Object.entries(resources ?? {})) {
      if (done) merged.resources[id] = true;
      else delete merged.resources[id];
    }
    const wasComplete = lineProgress(line, current).complete;
    progressRef.current = merged;
    setProgress(merged);
    if (!wasComplete && lineProgress(line, merged).complete) setTimeout(() => setToast({ key: Date.now(), line }), 700);
    persist(merged);
  }, [persist]);

  const withReadAt = (current: StationProgress, status: Status): StationProgress => ({
    ...current,
    status,
    readAt: status === "read" ? current.readAt ?? new Date().toISOString() : status === "unread" ? null : current.readAt,
  });

  const setStatus = useCallback((station: Station, line: Line, status: Status) => {
    const current = stationProgress(progressRef.current, station.id);
    const resources =
      status === "read" ? Object.fromEntries(station.resources.map((r) => [r.id, true]))
      : status === "unread" ? Object.fromEntries(station.resources.map((r) => [r.id, false]))
      : undefined;
    applyStation(station, line, withReadAt(current, status), resources);
  }, [applyStation]);

  const toggleResource = useCallback((station: Station, line: Line, resourceId: string) => {
    const current = progressRef.current;
    const done = !current.resources[resourceId];
    const status = statusFromResources(station, { ...current.resources, [resourceId]: done });
    applyStation(station, line, withReadAt(stationProgress(current, station.id), status), { [resourceId]: done });
  }, [applyStation]);

  const select = useCallback((id: string | null, fly = false) => {
    setSelectedId(id);
    if (!id) return;
    const lineId = findStation(CURRICULUM, id)?.line.id ?? null;
    setPinnedLineId((pinned) => (pinned && lineId ? lineId : pinned));
    if (fly) setTimeout(() => mapRef.current?.flyToStation(id), 120);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedId(null);
    setPinnedLineId(null);
  }, []);

  const pickLine = useCallback((id: string) => {
    setSelectedId(null);
    setPinnedLineId(id);
    mapRef.current?.flyToLine(id);
  }, []);

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rlonrails-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importProgress = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidProgress(parsed)) throw new Error("not a progress export");
      const clean = sanitizeProgress(CURRICULUM, parsed);
      progressRef.current = clean;
      setProgress(clean);
      persist(clean);
    } catch {
      setDialog({ title: "Import failed", body: "That file is not an RL on Rails progress export." });
    }
  };

  const selectAll = () => setDialog({
    title: "Mark everything as read?",
    body: "Every station and every resource will be marked as read. Export first if you want a backup.",
    confirmLabel: "Mark all read",
    onConfirm: () => void markAllRead(),
  });

  const markAllRead = () => {
    const now = new Date().toISOString();
    const current = progressRef.current;
    const all: Progress = { stations: {}, resources: {} };
    for (const line of CURRICULUM.lines) {
      for (const station of line.stations) {
        const existing = stationProgress(current, station.id);
        all.stations[station.id] = { status: "read", readAt: existing.readAt ?? now, updatedAt: now };
        for (const resource of station.resources) all.resources[resource.id] = true;
      }
    }
    progressRef.current = all;
    setProgress(all);
    persist(all);
  };

  const resetProgress = () => setDialog({
    title: "Clear all progress?",
    body: "Every status and tick will be removed. Export first if you want a backup.",
    confirmLabel: "Clear progress",
    danger: true,
    onConfirm: () => void clearProgress(),
  });

  const clearProgress = () => {
    const empty = emptyProgress();
    progressRef.current = empty;
    setProgress(empty);
    persist(empty);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (dialog || journeyOpen || (event.target as HTMLElement).matches("input")) return;
      if (event.key === "Escape") { closePanel(); return; }
      if (!selected) return;
      const { station, line } = selected;
      const index = line.stations.indexOf(station);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        const n = line.stations[index + 1];
        if (n) select(n.id, true);
        event.preventDefault();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        const p = line.stations[index - 1];
        if (p) select(p.id, true);
        event.preventDefault();
      } else if (event.key === " " || event.key === "Enter") {
        setStatus(station, line, isRead(progressRef.current, station.id) ? "unread" : "read");
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, select, setStatus, dialog, journeyOpen, closePanel]);

  const connections: Connection[] = useMemo(() => {
    if (!selected) return [];
    return CURRICULUM.links.flatMap(([a, b]) => {
      const otherId = a === selected.station.id ? b : b === selected.station.id ? a : null;
      if (!otherId) return [];
      const other = findStation(CURRICULUM, otherId)!;
      return [{ station: other.station, line: other.line, direction: a === selected.station.id ? "to" : "from", read: isRead(progress, otherId) } as Connection];
    });
  }, [selected, progress]);

  return (
    <div className={cx("grid h-full grid-rows-[1fr_auto] bg-paper text-ink", intro && "intro", (selected || pinnedLine) && "panel-open")}>
      <main className="relative min-h-0">
        <section className="map-wrap relative h-full overflow-hidden">
          <FloatingBar
            totals={sums}
            trainCount={trainCount}
            lines={CURRICULUM.lines}
            progressByLine={progressByLine}
            focusLineId={focusLineId}
            days={days}
            onJourney={() => setJourneyOpen(true)}
            onHoverLine={setHoverLineId}
            onPickLine={pickLine}
            onExport={exportProgress}
            onImport={importProgress}
            onReset={resetProgress}
            onSelectAll={selectAll}
          />
          <TubeMap
            ref={mapRef}
            layout={layout}
            schedule={schedule}
            hereId={next?.station.id ?? null}
            nextIds={nextIds}
            completeIds={completeIds}
            progress={progress}
            colours={colours}
            selectedId={selectedId}
            focusLineId={focusLineId}
            trainCount={trainCount}
            intro={intro}
            onSelect={(id) => select(id)}
            onPinLine={(id) => { setPinnedLineId(id); if (id) mapRef.current?.flyToLine(id); }}
          />
        </section>
        <StationPanel
          station={selected?.station ?? null}
          line={selected?.line ?? pinnedLine}
          progress={progress}
          log={log}
          connections={connections}
          saveError={saveError}
          onStatus={(status) => selected && setStatus(selected.station, selected.line, status)}
          onToggleResource={(id) => { const owner = findResource(CURRICULUM, id); if (owner) toggleResource(owner.station, owner.line, id); }}
          onSelect={(id) => select(id, true)}
          onClose={closePanel}
        />
      </main>
      <JourneyStrip lines={CURRICULUM.lines} progressByLine={progressByLine} focusLineId={focusLineId} onHover={setHoverLineId} onPick={pickLine} />
      <Toast toast={toast} />
      <Dialog dialog={dialog} onClose={closeDialog} />
      <JourneyModal open={journeyOpen} progress={progress} onClose={closeJourney} />
    </div>
  );
}

export function RLUnderground() {
  const stored = useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot, progressStore.getServerSnapshot);
  if (!stored) {
    return (
      <div className="grid h-full grid-rows-[1fr_auto]">
        <div className="map-wrap" />
        <div className="h-[calc(84px+var(--safe-bottom))] border-t border-rule bg-surface" />
      </div>
    );
  }
  return <Tracker initialProgress={stored} />;
}
