"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { readDays } from "@/lib/activity";
import {
  CURRICULUM,
  findLine,
  findResource,
  findStation,
  isTrackLine,
  type Line,
  logResources,
  rideOrder,
  type Station,
} from "@/lib/curriculum";
import { cx } from "@/lib/cx";
import { computeLayout, introSchedule } from "@/lib/geometry";
import {
  chooseDue,
  emptyProgress,
  isRead,
  isValidProgress,
  lineProgress,
  missingPrereqs,
  nextOnLine,
  nextStop,
  type Progress,
  SKILLS,
  type Skill,
  type StationProgress,
  type Status,
  sanitizeProgress,
  stationProgress,
  suggestStatus,
  totals,
} from "@/lib/progress";
import { progressStore, saveProgress } from "@/lib/storage";
import { TFL_COLOURS } from "@/lib/tfl";
import { Dialog, type DialogMessage } from "./Dialog";
import { FloatingBar } from "./FloatingBar";
import { JourneyModal } from "./Journey";
import { JourneyStrip } from "./JourneyStrip";
import { type Connection, type PanelView, StationPanel } from "./StationPanel";
import { Toast, type ToastMessage } from "./Toast";
import { TracksModal } from "./TracksModal";
import { TubeMap, type TubeMapHandle } from "./TubeMap";

export const trainCountFor = (readStations: number) =>
  readStations > 0 ? Math.min(22, 2 + Math.floor(readStations / 4)) : 0;
const LITE_INTRO_MS = 1400;
const RIDE_LINES = rideOrder(CURRICULUM);

const withReadAt = (current: StationProgress, status: Status): StationProgress => ({
  ...current,
  status,
  readAt:
    status === "read" ? (current.readAt ?? new Date().toISOString()) : status === "unread" ? null : current.readAt,
});

function Tracker({ initialProgress }: { initialProgress: Progress }) {
  const layout = useMemo(() => computeLayout(CURRICULUM), []);
  const schedule = useMemo(() => introSchedule(CURRICULUM, layout), [layout]);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverLineId, setHoverLineId] = useState<string | null>(null);
  const [pinnedLineId, setPinnedLineId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dialog, setDialog] = useState<DialogMessage | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const closeJourney = useCallback(() => setJourneyOpen(false), []);
  // Two ways in, and the copy differs: the map brings this up of its own accord
  // at the end of the research sampler, and the menu opens it whenever the
  // reader asks. Settling the question closes the first one for good.
  const [tracksFromMenu, setTracksFromMenu] = useState(false);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [saveError, setSaveError] = useState(false);
  const [intro, setIntro] = useState(true);
  // Touch devices get a lighter intro: one fade and a short flight instead of
  // drawing every line and station in. Each of those six hundred animations
  // changes SVG geometry, so every frame re-lays-out and repaints a map far
  // larger than a phone screen — five seconds at a dozen frames a second.
  const lite = useMemo(
    () => typeof globalThis.window !== "undefined" && globalThis.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const mapRef = useRef<TubeMapHandle | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const colours = useMemo(() => Object.fromEntries(CURRICULUM.lines.map((l) => [l.id, TFL_COLOURS[l.tfl]])), []);

  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), lite ? LITE_INTRO_MS : schedule.total + 1500);
    return () => clearTimeout(timer);
  }, [schedule.total, lite]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const focusLineId = hoverLineId ?? pinnedLineId;
  const selected = useMemo(() => (selectedId ? findStation(CURRICULUM, selectedId) : null), [selectedId]);
  const pinnedLine = pinnedLineId ? (findLine(CURRICULUM, pinnedLineId) ?? null) : null;
  const progressByLine = useMemo(
    () => Object.fromEntries(CURRICULUM.lines.map((l) => [l.id, lineProgress(l, progress)])),
    [progress],
  );
  const sums = useMemo(() => totals(CURRICULUM, progress), [progress]);
  // Held back until the map has finished drawing itself in, so the picker does
  // not land on top of the opening flight.
  const promptTracks = useMemo(() => !intro && chooseDue(CURRICULUM, progress), [progress, intro]);
  const tracksShown = promptTracks || tracksFromMenu;
  const next = useMemo(() => {
    const station = nextStop(CURRICULUM, progress);
    return station ? findStation(CURRICULUM, station.id) : null;
  }, [progress]);
  const nextIds = useMemo(
    () => Object.fromEntries(CURRICULUM.lines.map((line) => [line.id, nextOnLine(line, progress)?.id ?? null])),
    [progress],
  );
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

  const persist = useCallback((updated: Progress) => {
    try {
      saveProgress(updated);
      setSaveError(false);
    } catch (error) {
      console.error("save failed", error);
      setSaveError(true);
    }
  }, []);

  const applyStation = useCallback(
    (station: Station, line: Line, nextValue: StationProgress, resources?: Record<string, boolean>) => {
      const current = progressRef.current;
      const merged: Progress = {
        stations: { ...current.stations, [station.id]: { ...nextValue, updatedAt: new Date().toISOString() } },
        resources: { ...current.resources },
        tracks: current.tracks,
        tracksAt: current.tracksAt,
      };
      for (const [id, done] of Object.entries(resources ?? {})) {
        if (done) merged.resources[id] = true;
        else delete merged.resources[id];
      }
      const before = lineProgress(line, current);
      const after = lineProgress(line, merged);
      progressRef.current = merged;
      setProgress(merged);
      const kind =
        !before.explored && after.explored ? "explored" : !before.complete && after.complete ? "route" : null;
      if (kind) setTimeout(() => setToast({ key: Date.now(), line, kind, remaining: after.total - after.read }), 700);
      persist(merged);
    },
    [persist],
  );

  /** Status is what you claim about yourself. It never rewrites which resources you actually opened. */
  const setStatus = useCallback(
    (station: Station, line: Line, status: Status) => {
      const current = stationProgress(progressRef.current, station.id);
      applyStation(station, line, withReadAt(current, status));
    },
    [applyStation],
  );

  const toggleResource = useCallback(
    (station: Station, line: Line, resourceId: string) => {
      const current = progressRef.current;
      const done = !current.resources[resourceId];
      const status = suggestStatus(
        station,
        current,
        { ...current.resources, [resourceId]: done },
        stationProgress(current, station.id).deliverables,
      );
      applyStation(station, line, withReadAt(stationProgress(current, station.id), status), { [resourceId]: done });
    },
    [applyStation],
  );

  const toggleDeliverable = useCallback(
    (station: Station, line: Line, deliverableId: string) => {
      const current = progressRef.current;
      const existing = stationProgress(current, station.id);
      const done = existing.deliverables.includes(deliverableId)
        ? existing.deliverables.filter((id) => id !== deliverableId)
        : [...existing.deliverables, deliverableId];
      const status = suggestStatus(station, current, current.resources, done);
      applyStation(station, line, { ...withReadAt(existing, status), deliverables: done });
    },
    [applyStation],
  );

  const toggleSkill = useCallback(
    (station: Station, line: Line, skill: Skill) => {
      const existing = stationProgress(progressRef.current, station.id);
      const skills = existing.skills.includes(skill)
        ? existing.skills.filter((s) => s !== skill)
        : [...existing.skills, skill];
      applyStation(station, line, { ...existing, skills });
    },
    [applyStation],
  );

  const setTracks = useCallback(
    (tracks: string[], settled = false) => {
      const current = progressRef.current;
      const merged: Progress = { ...current, tracks, tracksAt: settled ? new Date().toISOString() : current.tracksAt };
      progressRef.current = merged;
      setProgress(merged);
      persist(merged);
    },
    [persist],
  );

  const toggleTrack = useCallback(
    (lineId: string) => {
      const { tracks } = progressRef.current;
      setTracks(tracks.includes(lineId) ? tracks.filter((id) => id !== lineId) : [...tracks, lineId]);
    },
    [setTracks],
  );

  const toggleAllTracks = useCallback(() => {
    const ids = CURRICULUM.lines.filter(isTrackLine).map((l) => l.id);
    setTracks(progressRef.current.tracks.length === ids.length ? [] : ids);
  }, [setTracks]);

  // Closing the picker is the answer, even when the answer is "none of them".
  // Without that the map would ask again on every visit.
  const closeTracks = useCallback(() => {
    setTracks(progressRef.current.tracks, true);
    setTracksFromMenu(false);
  }, [setTracks]);

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

  const selectAll = () =>
    setDialog({
      title: "Mark everything as read?",
      body: "Every station and every resource will be marked as read. Export first if you want a backup.",
      confirmLabel: "Mark all read",
      onConfirm: markAllRead,
    });

  const markAllRead = () => {
    const now = new Date().toISOString();
    const current = progressRef.current;
    const all: Progress = {
      stations: {},
      resources: {},
      tracks: CURRICULUM.lines.filter(isTrackLine).map((l) => l.id),
      tracksAt: now,
    };
    for (const line of CURRICULUM.lines) {
      for (const station of line.stations) {
        const existing = stationProgress(current, station.id);
        all.stations[station.id] = {
          status: "read",
          readAt: existing.readAt ?? now,
          updatedAt: now,
          skills: [...SKILLS],
          deliverables: station.deliverables?.map((d) => d.id) ?? [],
        };
        for (const resource of station.resources) all.resources[resource.id] = true;
      }
    }
    progressRef.current = all;
    setProgress(all);
    persist(all);
  };

  const resetProgress = () =>
    setDialog({
      title: "Clear all progress?",
      body: "Every status and tick will be removed. Export first if you want a backup.",
      confirmLabel: "Clear progress",
      danger: true,
      onConfirm: clearProgress,
    });

  const clearProgress = () => {
    const empty = emptyProgress();
    progressRef.current = empty;
    setProgress(empty);
    persist(empty);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (dialog || journeyOpen || tracksShown || (target instanceof HTMLElement && target.matches("input"))) return;
      if (event.key === "Escape") {
        closePanel();
        return;
      }
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
  }, [selected, select, setStatus, dialog, journeyOpen, tracksShown, closePanel]);

  const missing = useMemo(
    () => (selected ? missingPrereqs(CURRICULUM, selected.station, progress) : []),
    [selected, progress],
  );

  const connections: Connection[] = useMemo(() => {
    if (!selected) return [];
    return CURRICULUM.links.flatMap(([a, b]) => {
      const otherId = a === selected.station.id ? b : b === selected.station.id ? a : null;
      if (!otherId) return [];
      const other = findStation(CURRICULUM, otherId);
      if (!other) return [];
      return [
        {
          station: other.station,
          line: other.line,
          direction: a === selected.station.id ? "to" : "from",
          read: isRead(progress, otherId),
        } as Connection,
      ];
    });
  }, [selected, progress]);

  const panelView: PanelView = useMemo(
    () => ({ station: selected?.station ?? null, line: selected?.line ?? pinnedLine, log, connections, missing }),
    [selected, pinnedLine, log, connections, missing],
  );

  return (
    <div
      className={cx(
        "relative grid h-full grid-rows-[1fr_auto] bg-paper text-ink",
        intro && (lite ? "intro-lite" : "intro"),
        (selected || pinnedLine) && "panel-open",
      )}
    >
      <main className="relative min-h-0 overflow-hidden">
        <section className="map-wrap relative h-full overflow-hidden">
          <FloatingBar
            totals={sums}
            trainCount={trainCount}
            lines={RIDE_LINES}
            progressByLine={progressByLine}
            focusLineId={focusLineId}
            days={days}
            onJourney={() => setJourneyOpen(true)}
            onHoverLine={setHoverLineId}
            onPickLine={pickLine}
            tracks={progress.tracks}
            onChooseTracks={() => setTracksFromMenu(true)}
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
            intro={intro && !lite}
            lite={lite}
            panelRef={panelRef}
            panelOpen={Boolean(selected || pinnedLine)}
            onSelect={(id) => select(id)}
            onPinLine={(id) => {
              setPinnedLineId(id);
              if (id) mapRef.current?.flyToLine(id);
            }}
          />
        </section>
        <StationPanel
          ref={panelRef}
          view={panelView}
          progress={progress}
          saveError={saveError}
          onStatus={(status) => selected && setStatus(selected.station, selected.line, status)}
          onSkill={(skill) => selected && toggleSkill(selected.station, selected.line, skill)}
          onToggleDeliverable={(id) => selected && toggleDeliverable(selected.station, selected.line, id)}
          onToggleResource={(id) => {
            const owner = findResource(CURRICULUM, id);
            if (owner) toggleResource(owner.station, owner.line, id);
          }}
          onSelect={(id) => select(id, true)}
          onClose={closePanel}
        />
      </main>
      <JourneyStrip
        lines={RIDE_LINES}
        progressByLine={progressByLine}
        focusLineId={focusLineId}
        onHover={setHoverLineId}
        onPick={pickLine}
      />
      <Toast toast={toast} />
      <Dialog dialog={dialog} onClose={closeDialog} />
      <JourneyModal open={journeyOpen} progress={progress} onClose={closeJourney} />
      <TracksModal
        open={tracksShown}
        prompted={promptTracks}
        tracks={progress.tracks}
        onToggle={toggleTrack}
        onAll={toggleAllTracks}
        onDone={closeTracks}
      />
    </div>
  );
}

export function RLUnderground() {
  // Only whether storage has been read matters here: the tracker owns the
  // progress once it has it. Subscribing to the value itself re-rendered the
  // whole tree a second time on every save.
  const loaded = useSyncExternalStore<boolean>(
    progressStore.subscribe,
    () => true,
    () => false,
  );
  const stored = loaded ? progressStore.getSnapshot() : null;
  if (!stored) {
    return (
      <div className="grid h-full grid-rows-[1fr_auto]">
        <div className="map-wrap" />
        <div className="h-[calc(84px+var(--safe-bottom))] border-rule border-t bg-surface" />
      </div>
    );
  }
  return <Tracker initialProgress={stored} />;
}
