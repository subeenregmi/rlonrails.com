"use client";

import type { Line, LogEntry, Resource, ResourceKind, Station } from "@/lib/curriculum";
import {
  SKILLS, STATUSES, deliverables, emptyStation, isOnRoute, lineProgress, requirement, stationProgress, statusOf,
  type Progress, type Requirement, type Skill, type Status,
} from "@/lib/progress";
import { TFL_COLOURS, textOn } from "@/lib/tfl";
import { cx } from "@/lib/cx";
import { ArrowLeftIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon, LockClosedIcon } from "@heroicons/react/16/solid";
import { XMarkIcon } from "@heroicons/react/20/solid";

export interface Connection {
  station: Station;
  line: Line;
  direction: "to" | "from";
  read: boolean;
}

interface StationPanelProps {
  station: Station | null;
  line: Line | null;
  progress: Progress;
  log: LogEntry[];
  connections: Connection[];
  missing: Station[];
  saveError: boolean;
  onStatus: (status: Status) => void;
  onSkill: (skill: Skill) => void;
  onToggleDeliverable: (deliverableId: string) => void;
  onToggleResource: (resourceId: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const KIND_LABEL: Record<ResourceKind, string> = {
  paper: "Paper", chapter: "Chapter", book: "Book", video: "Video", course: "Course", code: "Code", blog: "Blog", site: "Web",
};
const KIND_STYLE: Record<ResourceKind, string> = {
  paper: "bg-[#003688] text-white",
  chapter: "bg-[#EE7C0E] text-white",
  book: "bg-[#B36305] text-white",
  video: "bg-[#E32017] text-white",
  course: "bg-[#6950A1] text-white",
  code: "bg-[#00782A] text-white",
  blog: "bg-[#0098D4] text-white",
  site: "bg-[#A0A5A9] text-white",
};
const STATUS_LABEL: Record<Status, string> = { unread: "Not started", reading: "Reading", read: "Done" };
const TAG_LABEL: Record<Station["tag"], string> = { core: "Core", track: "Track", reference: "Reference", exercise: "Exercise" };
const TAG_STYLE: Record<Station["tag"], string> = {
  core: "bg-tfl-red", track: "bg-[#5A5D61]", reference: "bg-ink-faint", exercise: "bg-tfl-blue",
};
const TAG_NOTE: Record<Station["tag"], string> = {
  core: "Everyone needs this one.",
  track: "Needed for this specialisation, not for everyone.",
  reference: "Come back to it when a project asks for it.",
  exercise: "Done when the deliverables below exist.",
};
const SKILL_LABEL: Record<Skill, string> = { understood: "Understood", implemented: "Implemented", investigated: "Investigated" };
const SKILL_HINT: Record<Skill, string> = {
  understood: "I can explain it and say what it buys.",
  implemented: "I have written a working version myself.",
  investigated: "I have tested a claim about it with my own evidence.",
};

// One formatter, built on first use: toLocaleDateString with options builds a
// new one every call, and that costs tens of milliseconds on a phone — paid on
// every re-render of a read station's panel, so on every tick.
let dateFormat: Intl.DateTimeFormat | null = null;
const fmtDate = (iso: string) => (dateFormat ??= new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" })).format(new Date(iso));
const sourceWord = (station: Station) =>
  station.resources.some((r) => r.kind === "book") ? "book" : station.resources.some((r) => r.kind === "course") ? "course" : "set";

export function StationPanel(props: StationPanelProps) {
  const { station, line, progress, log, connections, missing, saveError, onStatus, onSkill, onToggleDeliverable, onToggleResource, onSelect, onClose } = props;
  const current = station ? stationProgress(progress, station.id) : emptyStation();
  const resources = progress.resources;
  const open = Boolean(line);
  const colour = line ? TFL_COLOURS[line.tfl] : "#0019A8";
  const on = line ? textOn(line.tfl) : "#fff";
  const index = station && line ? line.stations.indexOf(station) : 0;
  const prev = line && index > 0 ? line.stations[index - 1] : null;
  const next = line && index < (line?.stations.length ?? 0) - 1 ? line.stations[index + 1] : null;
  const logDone = log.filter((e) => resources[e.resource.id]).length;
  const ownDone = station ? station.resources.filter((r) => resources[r.id]).length : 0;
  const complete = log.length > 0 && logDone === log.length && ownDone === (station?.resources.length ?? 0);
  const req = station ? requirement(station, resources) : null;
  const dels = station ? deliverables(station, current.deliverables) : null;
  const onRoute = station && line ? isOnRoute(station, line, progress.tracks) : true;

  return (
    // Slides in with a transform. Animating the width instead re-laid-out and
    // re-wrapped every line of text in the panel on each frame of the slide.
    <aside
      className={cx("absolute inset-y-0 right-0 z-30 w-full overflow-x-hidden overflow-y-auto overscroll-contain border-l border-rule bg-surface pr-safe-right transition-transform duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)] sm:w-[calc(380px+var(--safe-right))]", open ? "translate-x-0" : "translate-x-full")}
      style={{ "--c": colour, "--on": on } as React.CSSProperties}
      aria-hidden={!open}
    >
      {line && (
        <div key={station?.id ?? line.id} className="panel-switch w-full pb-[calc(1.5rem+var(--safe-bottom))] sm:w-[380px]">
          <header className="relative px-5 pt-[calc(1rem+var(--safe-top))] pb-4" style={{ background: colour, color: on }}>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="absolute top-[calc(0.5rem+var(--safe-top))] right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 hover:bg-black/30"
              style={{ color: on }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <div className="pr-8 text-[11px] uppercase tracking-[0.1em] opacity-90">{line.phase} · {station ? line.name : `${line.stations.length} stops`}</div>
            <h2 className="mt-1.5 text-[20px] leading-tight">{station ? station.title : line.name}</h2>
            <div className="mt-2.5 text-[12px] opacity-80">
              {station ? `Stop ${index + 1} of ${line.stations.length} · ${station.name}` : `${lineProgress(line, progress).read} of ${line.stations.length} stations read`}
            </div>
          </header>

          {!station && <LineStops line={line} progress={progress} colour={colour} onSelect={onSelect} />}
          {station && (
          <div className="px-5 pt-4">
            <p className="text-[13px] leading-snug text-ink-soft">{station.meta}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={cx("inline-block flex-none rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-white", TAG_STYLE[station.tag])}>{TAG_LABEL[station.tag]}</span>
              <span className="text-[12px] leading-snug text-ink-faint">
                {onRoute ? TAG_NOTE[station.tag] : `Not on your route. Pick ${line.short} in the menu if this specialisation is yours.`}
              </span>
            </div>

            {station.outcome && (
              <>
                <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">What you can do after this</h3>
                <p className="text-[14.5px] leading-normal">{station.outcome}</p>
              </>
            )}

            {missing.length > 0 && current.status !== "read" && (
              <div className="mt-5 rounded-xl border border-rule bg-tint px-3 py-2.5">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                  <LockClosedIcon className="h-3 w-3" /> Read first
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((s) => (
                    <button key={s.id} type="button" onClick={() => onSelect(s.id)} className="rounded-full bg-surface px-2.5 py-1 text-[12.5px] hover:bg-tint-strong">
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Status</h3>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-tint p-1">
              {STATUSES.map((status) => {
                const active = current.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatus(status)}
                    className={cx("rounded-lg px-2 py-2 text-[13px] transition", active ? "shadow-[0_2px_0_rgba(0,0,0,.12)]" : "text-ink-soft hover:bg-surface/70")}
                    style={active ? { background: colour, color: on } : undefined}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 min-h-4 text-center text-[12px] text-ink-soft">
              {current.status === "read" && current.readAt && `Read on ${fmtDate(current.readAt)}`}
              {current.status === "reading" && dels && dels.total > 0 && `${dels.done} of ${dels.total} deliverables`}
              {current.status === "reading" && req && dels?.total === 0 && `${req.required.done} of ${req.required.total} required${req.pick.total ? ` · ${req.pick.done} of ${req.pick.need} picked` : ""}`}
              {log.length > 0 && (
                <span className={cx("block", complete && "font-bold")} style={complete ? { color: colour } : undefined}>
                  {complete ? `Whole ${sourceWord(station)} complete` : `Whole ${sourceWord(station)} · ${ownDone + logDone} / ${station.resources.length + log.length}`}
                </span>
              )}
              {saveError && <span className="block text-tfl-red">Could not save to browser storage.</span>}
            </div>

            <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Demonstrated</h3>
            <div className="flex flex-wrap gap-1.5">
              {SKILLS.map((skill) => {
                const on = current.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => onSkill(skill)}
                    aria-pressed={on}
                    title={SKILL_HINT[skill]}
                    className={cx("rounded-full border px-3 py-1.5 text-[12.5px] transition", on ? "border-transparent text-white" : "border-rule text-ink-soft hover:bg-tint")}
                    style={on ? { background: colour } : undefined}
                  >
                    {SKILL_LABEL[skill]}
                  </button>
                );
              })}
            </div>

            {station.deliverables && station.deliverables.length > 0 && dels && (
              <DeliverableList station={station} done={current.deliverables} dels={dels} colour={colour} onToggle={onToggleDeliverable} />
            )}

            {req && <ReadList station={station} req={req} resources={resources} colour={colour} onToggle={onToggleResource} />}
            {log.length > 0 && <LogList log={log} resources={resources} done={logDone} colour={colour} onToggle={onToggleResource} onSelect={onSelect} />}

            <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Key idea</h3>
            <p className="text-[14.5px] leading-normal">{station.idea}</p>
            <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Forward link</h3>
            <p className="text-[14.5px] leading-normal">{station.fwd}</p>

            {connections.length > 0 && (
              <>
                <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Connections</h3>
                <div className="flex flex-wrap gap-1.5">
                  {connections.map((c) => (
                    <button
                      key={c.station.id}
                      type="button"
                      onClick={() => onSelect(c.station.id)}
                      title={`${c.line.name}: ${c.station.title}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-tint py-1 pr-2.5 pl-1.5 text-[12.5px] hover:bg-tint-strong"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: TFL_COLOURS[c.line.tfl], boxShadow: c.read ? "inset 0 0 0 2px var(--surface)" : undefined }} />
                      {c.station.name}
                      {c.direction === "to" ? <ArrowRightIcon className="h-3 w-3 text-ink-faint" /> : <ArrowLeftIcon className="h-3 w-3 text-ink-faint" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">About this line</h3>
            <p className="text-[13px] leading-normal text-ink-soft">{line.goal}</p>

            <div className="mt-5 flex justify-between gap-2">
              <button type="button" disabled={!prev} onClick={() => prev && onSelect(prev.id)} className="flex flex-1 items-center gap-1.5 rounded-full bg-tint px-3.5 py-2 text-left text-[13px] hover:bg-tint-strong disabled:cursor-default disabled:opacity-40">
                <ArrowLeftIcon className="h-3.5 w-3.5 flex-none" />
                <span className="truncate">{prev ? prev.name : "Start of line"}</span>
              </button>
              <button type="button" disabled={!next} onClick={() => next && onSelect(next.id)} className="flex flex-1 items-center justify-end gap-1.5 rounded-full bg-tint px-3.5 py-2 text-right text-[13px] hover:bg-tint-strong disabled:cursor-default disabled:opacity-40">
                <span className="truncate">{next ? next.name : "End of line"}</span>
                <ArrowRightIcon className="h-3.5 w-3.5 flex-none" />
              </button>
            </div>
          </div>
          )}
        </div>
      )}
    </aside>
  );
}

function LineStops({ line, progress, colour, onSelect }: { line: Line; progress: Progress; colour: string; onSelect: (id: string) => void }) {
  return (
    <div className="px-5 pt-4">
      <p className="text-[13px] leading-snug text-ink-soft">{line.goal}</p>
      <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Stations</h3>
      <ol className="ml-2 border-l-[6px] pl-4" style={{ borderColor: colour }}>
        {line.stations.map((station) => {
          const status = statusOf(progress, station.id);
          return (
            <li key={station.id} className="relative">
              <button type="button" onClick={() => onSelect(station.id)} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-tint">
                <span
                  className="absolute top-[13px] -left-[26px] h-3.5 w-3.5 rounded-full border-[3px]"
                  style={{
                    borderColor: colour,
                    background: status === "read" ? colour : status === "reading" ? `linear-gradient(90deg, ${colour} 50%, var(--surface) 50%)` : "var(--surface)",
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-[13.5px] leading-snug", status === "read" && "text-ink-soft")}>{station.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">{station.title}</span>
                </span>
                <span className={cx("flex-none rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-white", TAG_STYLE[station.tag])}>{TAG_LABEL[station.tag]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DeliverableList({ station, done, dels, colour, onToggle }: { station: Station; done: string[]; dels: { done: number; total: number }; colour: string; onToggle: (id: string) => void }) {
  return (
    <>
      <h3 className="mt-5 mb-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">Deliverables · {dels.done} / {dels.total}</h3>
      <p className="mb-1.5 text-[11.5px] text-ink-faint">This station is done when these exist, not when the reading is ticked.</p>
      <ul className="flex flex-col gap-1.5">
        {station.deliverables?.map((deliverable) => {
          const on = done.includes(deliverable.id);
          return (
            <li key={deliverable.id} className={cx("flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition", on ? "border-transparent bg-tint" : "border-rule bg-surface")}>
              <button
                type="button"
                onClick={() => onToggle(deliverable.id)}
                aria-pressed={on}
                aria-label={on ? `Mark not done: ${deliverable.label}` : `Mark done: ${deliverable.label}`}
                className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 text-white transition"
                style={{ borderColor: colour, background: on ? colour : "var(--surface)" }}
              >
                {on && <CheckIcon className="h-3 w-3" />}
              </button>
              <span className={cx("min-w-0 flex-1 text-[13.5px] leading-snug", on && "text-ink-soft")}>{deliverable.label}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ReadList({ station, req, resources, colour, onToggle }: { station: Station; req: Requirement; resources: Record<string, boolean>; colour: string; onToggle: (id: string) => void }) {
  const groups = [
    { key: "required", title: "Required", items: station.resources.filter((r) => !r.role), count: `${req.required.done} / ${req.required.total}`, locked: false },
    { key: "pick", title: `Pick at least ${req.pick.need}`, items: station.resources.filter((r) => r.role === "pick"), count: `${req.pick.done} / ${req.pick.total}`, locked: false },
    { key: "optional", title: "Optional", items: station.resources.filter((r) => r.role === "optional"), count: `${req.optional.done} / ${req.optional.total}`, locked: !req.met },
  ].filter((g) => g.items.length > 0);
  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className={cx("transition-opacity", group.locked && "opacity-55")}>
          <h3 className="mt-5 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            {group.locked && <LockClosedIcon className="h-3 w-3" />}
            {group.title} · {group.count}
          </h3>
          {group.locked && <p className="mb-1.5 text-[11.5px] text-ink-faint">Unlocks when the required items are done.</p>}
          <ul className="flex flex-col gap-1.5">
            {group.items.map((resource) => (
              <ResourceRow key={resource.id} resource={resource} done={Boolean(resources[resource.id])} colour={colour} onToggle={() => onToggle(resource.id)} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function LogList({ log, resources, done, colour, onToggle, onSelect }: { log: LogEntry[]; resources: Record<string, boolean>; done: number; colour: string; onToggle: (id: string) => void; onSelect: (id: string) => void }) {
  const groups: { station: Station; line: Line; entries: LogEntry[] }[] = [];
  for (const entry of log) {
    const last = groups[groups.length - 1];
    if (last && last.station.id === entry.station.id) last.entries.push(entry);
    else groups.push({ station: entry.station, line: entry.line, entries: [entry] });
  }
  return (
    <>
      <h3 className="mt-5 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-faint">
        Across the map · {done} / {log.length}
        {done === log.length && <CheckIcon className="h-3.5 w-3.5" style={{ color: colour }} />}
      </h3>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-bar">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(100 * done) / log.length}%`, background: colour }} />
      </div>
      <p className="mb-3 text-[12px] leading-snug text-ink-soft">Chapters and lectures from this source that live on other stations. Ticking them here ticks them there.</p>
      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const colour = TFL_COLOURS[group.line.tfl];
          return (
            <div key={group.station.id}>
              <button type="button" onClick={() => onSelect(group.station.id)} className="mb-1 inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-1 text-[12px] text-ink-soft hover:bg-tint">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
                {group.line.phase} · {group.station.name}
                <ArrowRightIcon className="h-3 w-3 text-ink-faint" />
              </button>
              <ul className="flex flex-col gap-1.5">
                {group.entries.map((entry) => (
                  <ResourceRow key={entry.resource.id} resource={entry.resource} done={Boolean(resources[entry.resource.id])} colour={colour} onToggle={() => onToggle(entry.resource.id)} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ResourceRow({ resource, done, colour, onToggle }: { resource: Resource; done: boolean; colour: string; onToggle: () => void }) {
  return (
    <li className={cx("flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition", done ? "border-transparent bg-tint" : "border-rule bg-surface")}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark ${resource.label} not done` : `Mark ${resource.label} done`}
        className="flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 text-white transition"
        style={{ borderColor: colour, background: done ? colour : "var(--surface)" }}
      >
        {done && <CheckIcon className="h-3 w-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cx("block text-[13.5px] leading-snug underline-offset-2 hover:underline", done && "text-ink-soft")}
        >
          {resource.label}
          <ArrowTopRightOnSquareIcon className="ml-1 inline h-3 w-3 align-[-1px] text-ink-faint" />
        </a>
      </div>
      <span className={cx("flex-none rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.06em]", KIND_STYLE[resource.kind])}>{KIND_LABEL[resource.kind]}</span>
    </li>
  );
}
