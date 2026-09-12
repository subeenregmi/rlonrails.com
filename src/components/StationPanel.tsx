"use client";

import { ArrowLeftIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, LockClosedIcon } from "@heroicons/react/16/solid";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { type Ref, useState } from "react";
import {
  CURRICULUM,
  type Line,
  type LogEntry,
  logResources,
  type Resource,
  type ResourceKind,
  type Station,
} from "@/lib/curriculum";
import { cx } from "@/lib/cx";
import { KIND_ICON, KindBadge, sourceHeading, sourceKind, sourceWord } from "@/lib/kinds";
import {
  deliverables,
  emptyStation,
  isOnRoute,
  lineProgress,
  type Progress,
  type Requirement,
  requirement,
  SKILLS,
  type Skill,
  STATUSES,
  type Status,
  stationProgress,
  statusOf,
} from "@/lib/progress";
import { TFL_COLOURS, textOn } from "@/lib/tfl";
import { Tick } from "./Tick";

export interface Connection {
  station: Station;
  line: Line;
  direction: "to" | "from";
  read: boolean;
}

export interface PanelView {
  station: Station | null;
  line: Line | null;
  log: LogEntry[];
  connections: Connection[];
  missing: Station[];
}

interface Shown {
  view: PanelView;
  leaving: boolean;
}

interface StationPanelProps {
  ref?: Ref<HTMLElement>;
  view: PanelView;
  progress: Progress;
  saveError: boolean;
  onStatus: (status: Status) => void;
  onSkill: (skill: Skill) => void;
  onToggleDeliverable: (deliverableId: string) => void;
  onToggleResource: (resourceId: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<Status, string> = { unread: "Not started", reading: "Reading", read: "Done" };
const TAG_LABEL: Record<Station["tag"], string> = {
  core: "Core",
  track: "Track",
  reference: "Reference",
  exercise: "Exercise",
};
const TAG_STYLE: Record<Station["tag"], string> = {
  core: "bg-tfl-red",
  track: "bg-[#5A5D61]",
  reference: "bg-ink-faint",
  exercise: "bg-tfl-blue",
};
const TAG_NOTE: Record<Station["tag"], string> = {
  core: "Everyone needs this one.",
  track: "Needed for this specialisation, not for everyone.",
  reference: "Come back to it when a project asks for it.",
  exercise: "Done when the deliverables below exist.",
};
const SKILL_LABEL: Record<Skill, string> = {
  understood: "Understood",
  implemented: "Implemented",
  investigated: "Investigated",
};
const SKILL_HINT: Record<Skill, string> = {
  understood: "I can explain it and say what it buys.",
  implemented: "I have written a working version myself.",
  investigated: "I have tested a claim about it with my own evidence.",
};

// One formatter, built on first use: toLocaleDateString with options builds a
// new one every call, and that costs tens of milliseconds on a phone — paid on
// every re-render of a read station's panel, so on every tick.
let dateFormat: Intl.DateTimeFormat | null = null;
/** A station that owns a book or a course whose parts are taught elsewhere. */
const isSourceStation = (station: Station) => logResources(CURRICULUM, station.id).length > 0;

const fmtDate = (iso: string) => {
  dateFormat ??= new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
  return dateFormat.format(new Date(iso));
};

export function StationPanel(props: StationPanelProps) {
  const {
    ref,
    view,
    progress,
    saveError,
    onStatus,
    onSkill,
    onToggleDeliverable,
    onToggleResource,
    onSelect,
    onClose,
  } = props;
  const open = Boolean(view.line);
  const [shown, setShown] = useState<Shown | null>(open ? { view, leaving: false } : null);
  if (open && view !== shown?.view) setShown({ view, leaving: false });
  else if (!open && shown && !shown.leaving) setShown({ view: shown.view, leaving: true });
  const { station, line, log, connections, missing } = shown?.view ?? view;
  const current = station ? stationProgress(progress, station.id) : emptyStation();
  const resources = progress.resources;
  const colour = line ? TFL_COLOURS[line.tfl] : "#0019A8";
  const on = line ? textOn(line.tfl) : "#fff";
  const index = station && line ? line.stations.indexOf(station) : 0;
  const prev = line && index > 0 ? line.stations[index - 1] : null;
  const next = line && index < (line?.stations.length ?? 0) - 1 ? line.stations[index + 1] : null;
  const logDone = log.filter((e) => resources[e.resource.id]).length;
  const ownDone = station ? station.resources.filter((r) => resources[r.id]).length : 0;
  const complete = log.length > 0 && logDone === log.length && ownDone === (station?.resources.length ?? 0);
  // A station that owns a book or a course, with its chapters scattered over
  // the map. What it holds is the whole of the panel: the reading is the
  // station, so it is listed rather than announced under Status.
  const isSource = Boolean(station) && log.length > 0;
  const req = station ? requirement(station, resources) : null;
  const dels = station ? deliverables(station, current.deliverables) : null;
  const onRoute = station && line ? isOnRoute(station, line, progress.tracks) : true;

  return (
    // Slides in with a transform. Animating the width instead re-laid-out and
    // re-wrapped every line of text in the panel on each frame of the slide.
    <aside
      ref={ref}
      className={cx(
        "absolute inset-y-0 right-0 z-30 w-full overflow-y-auto overflow-x-hidden overscroll-contain border-rule border-l bg-surface transition-transform duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)] sm:w-[calc(380px+var(--safe-right))]",
        open ? "translate-x-0" : "translate-x-full",
      )}
      style={{ "--c": colour, "--on": on } as React.CSSProperties}
      aria-hidden={!open}
      onTransitionEnd={(event) => {
        if (
          shown?.leaving &&
          event.target === event.currentTarget &&
          (event.propertyName === "translate" || event.propertyName === "transform")
        )
          setShown(null);
      }}
    >
      {/* Nothing inside holds itself off a landscape display cutout: the panel
          widens by the inset instead, so the header, the text and the close
          button all reach the same edge and the line colour has no white strip
          beside it. */}
      {line ? (
        <div key={station?.id ?? line.id} className="panel-switch w-full pb-[calc(1.5rem+var(--safe-bottom))]">
          <header
            className="relative px-5 pt-[calc(1rem+var(--safe-top))] pb-4"
            style={{ background: colour, color: on }}
          >
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="absolute top-[calc(0.5rem+var(--safe-top))] right-2 z-10 flex size-10 items-center justify-center rounded-full bg-black/15 hover:bg-black/30"
              style={{ color: on }}
            >
              <XMarkIcon className="size-5" />
            </button>
            <div className="flex items-center gap-1.5 pr-8 text-[11px] uppercase tracking-[0.1em] opacity-90">
              {isSource && station ? <SourceIcon station={station} className="size-3.5 flex-none" /> : null}
              <span className="truncate">
                {line.phase} · {station ? line.name : `${line.stations.length} stops`}
              </span>
            </div>
            <h2 className="mt-1.5 text-[20px] leading-tight">{station ? station.title : line.name}</h2>
            <div className="mt-2.5 text-[12px] opacity-80">
              {station
                ? `Stop ${index + 1} of ${line.stations.length} · ${station.name}`
                : `${lineProgress(line, progress).read} of ${line.stations.length} stations read`}
            </div>
          </header>

          {!station && <LineStops line={line} progress={progress} colour={colour} onSelect={onSelect} />}
          {station && isSource ? (
            <SourceView
              station={station}
              line={line}
              log={log}
              resources={resources}
              colour={colour}
              done={ownDone + logDone}
              complete={complete}
              saveError={saveError}
              prev={prev}
              next={next}
              onToggle={onToggleResource}
              onSelect={onSelect}
            />
          ) : null}
          {station && !isSource && (
            <div className="px-5 pt-4">
              <p className="text-[13px] text-ink-soft leading-snug">{station.meta}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={cx(
                    "inline-block flex-none rounded-full px-2.5 py-1 text-[11px] text-white uppercase tracking-[0.08em]",
                    TAG_STYLE[station.tag],
                  )}
                >
                  {TAG_LABEL[station.tag]}
                </span>
                <span className="text-[12px] text-ink-faint leading-snug">
                  {onRoute
                    ? TAG_NOTE[station.tag]
                    : `Not on your route. Pick ${line.short} in the menu if this specialisation is yours.`}
                </span>
              </div>

              {station.outcome ? (
                <>
                  <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">
                    What you can do after this
                  </h3>
                  <p className="text-[14.5px] leading-normal">{station.outcome}</p>
                </>
              ) : null}

              {missing.length > 0 && current.status !== "read" && (
                <div className="mt-5 rounded-xl border border-rule bg-tint px-3 py-2.5">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">
                    <LockClosedIcon className="size-3" /> Read first
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelect(s.id)}
                        className="rounded-full bg-surface px-2.5 py-1 text-[12.5px] hover:bg-tint-strong"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Status</h3>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-tint p-1">
                {STATUSES.map((status) => {
                  const active = current.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onStatus(status)}
                      className={cx(
                        "rounded-lg px-2 py-2 text-[13px] transition",
                        active ? "shadow-[0_2px_0_rgba(0,0,0,.12)]" : "text-ink-soft hover:bg-surface/70",
                      )}
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
                {current.status === "reading" &&
                  req &&
                  dels?.total === 0 &&
                  `${req.required.done} of ${req.required.total} required${req.pick.total ? ` · ${req.pick.done} of ${req.pick.need} picked` : ""}`}
                {saveError ? <span className="block text-tfl-red">Could not save to browser storage.</span> : null}
              </div>

              <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Demonstrated</h3>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((skill) => {
                  const demonstrated = current.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => onSkill(skill)}
                      aria-pressed={demonstrated}
                      title={SKILL_HINT[skill]}
                      className={cx(
                        "rounded-full border px-3 py-1.5 text-[12.5px] transition",
                        demonstrated ? "border-transparent text-white" : "border-rule text-ink-soft hover:bg-tint",
                      )}
                      style={demonstrated ? { background: colour } : undefined}
                    >
                      {SKILL_LABEL[skill]}
                    </button>
                  );
                })}
              </div>

              {station.deliverables && station.deliverables.length > 0 && dels && (
                <DeliverableList
                  station={station}
                  done={current.deliverables}
                  dels={dels}
                  colour={colour}
                  onToggle={onToggleDeliverable}
                />
              )}

              {req ? (
                <ReadList
                  station={station}
                  req={req}
                  resources={resources}
                  colour={colour}
                  onToggle={onToggleResource}
                />
              ) : null}

              <PanelTail
                station={station}
                line={line}
                connections={connections}
                prev={prev}
                next={next}
                idea
                onSelect={onSelect}
              />
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function LineStops({
  line,
  progress,
  colour,
  onSelect,
}: {
  line: Line;
  progress: Progress;
  colour: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="px-5 pt-4">
      <p className="text-[13px] text-ink-soft leading-snug">{line.goal}</p>
      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Where you are</h3>
      <p className="text-[14px] leading-normal">{line.problem}</p>
      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">What this line covers</h3>
      <p className="text-[14px] leading-normal">{line.approach}</p>
      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">What you leave with</h3>
      <p className="text-[14px] leading-normal">{line.outcome}</p>
      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Stations</h3>
      <ol className="ml-2 border-l-[6px] pl-4" style={{ borderColor: colour }}>
        {line.stations.map((station) => {
          const status = statusOf(progress, station.id);
          return (
            <li key={station.id} className="relative">
              <button
                type="button"
                onClick={() => onSelect(station.id)}
                className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition hover:bg-tint"
              >
                <span
                  className="absolute top-[13px] -left-[26px] size-3.5 rounded-full border-[3px]"
                  style={{
                    borderColor: colour,
                    background:
                      status === "read"
                        ? colour
                        : status === "reading"
                          ? `linear-gradient(90deg, ${colour} 50%, var(--surface) 50%)`
                          : "var(--surface)",
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cx(
                      "flex items-center gap-1.5 text-[13.5px] leading-snug",
                      status === "read" && "text-ink-soft",
                    )}
                  >
                    <span className="truncate">{station.name}</span>
                    {isSourceStation(station) && (
                      <SourceIcon station={station} className="size-3.5 flex-none text-ink-faint" />
                    )}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-faint">{station.title}</span>
                </span>
                <span
                  className={cx(
                    "flex-none rounded-full px-2 py-0.5 text-[10px] text-white uppercase tracking-[0.06em]",
                    TAG_STYLE[station.tag],
                  )}
                >
                  {TAG_LABEL[station.tag]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DeliverableList({
  station,
  done,
  dels,
  colour,
  onToggle,
}: {
  station: Station;
  done: string[];
  dels: { done: number; total: number };
  colour: string;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">
        Deliverables · {dels.done} / {dels.total}
      </h3>
      <p className="mb-1.5 text-[11.5px] text-ink-faint">
        This station is done when these exist, not when the reading is ticked.
      </p>
      <ul className="flex flex-col gap-1.5">
        {station.deliverables?.map((deliverable) => {
          const on = done.includes(deliverable.id);
          return (
            <li
              key={deliverable.id}
              className={cx(
                "flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition",
                on ? "border-transparent bg-tint" : "border-rule bg-surface",
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(deliverable.id)}
                aria-pressed={on}
                aria-label={on ? `Mark not done: ${deliverable.label}` : `Mark done: ${deliverable.label}`}
                className="mt-px flex size-5 flex-none items-center justify-center rounded-md border-2 text-white transition"
                style={{ borderColor: colour, background: on ? colour : "var(--surface)" }}
              >
                {on && <Tick className="size-3" />}
              </button>
              <span className={cx("min-w-0 flex-1 text-[13.5px] leading-snug", on && "text-ink-soft")}>
                {deliverable.label}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ReadList({
  station,
  req,
  resources,
  colour,
  onToggle,
}: {
  station: Station;
  req: Requirement;
  resources: Record<string, boolean>;
  colour: string;
  onToggle: (id: string) => void;
}) {
  const groups = [
    {
      key: "required",
      title: "Required",
      items: station.resources.filter((r) => !r.role),
      count: `${req.required.done} / ${req.required.total}`,
      locked: false,
    },
    {
      key: "pick",
      title: `Pick at least ${req.pick.need}`,
      items: station.resources.filter((r) => r.role === "pick"),
      count: `${req.pick.done} / ${req.pick.total}`,
      locked: false,
    },
    {
      key: "optional",
      title: "Optional",
      items: station.resources.filter((r) => r.role === "optional"),
      count: `${req.optional.done} / ${req.optional.total}`,
      locked: !req.met,
    },
  ].filter((g) => g.items.length > 0);
  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className={cx("transition-opacity", group.locked && "opacity-55")}>
          <h3 className="mt-5 mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">
            {group.locked ? <LockClosedIcon className="size-3" /> : null}
            {group.title} · {group.count}
          </h3>
          {group.locked ? (
            <p className="mb-1.5 text-[11.5px] text-ink-faint">Unlocks when the required items are done.</p>
          ) : null}
          <ul className="flex flex-col gap-1.5">
            {group.items.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                done={Boolean(resources[resource.id])}
                colour={colour}
                onToggle={() => onToggle(resource.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** What a source station is, as a shape: a book, a course, a set of repos. */
function SourceIcon({ station, className }: { station: Station; className?: string }) {
  const Icon = KIND_ICON[sourceKind(station)];
  return <Icon className={className} aria-hidden="true" />;
}

interface SourceItem {
  resource: Resource;
  /** The station that teaches it. Null for the parts that are read here. */
  at: { station: Station; line: Line } | null;
}

const ITEM_HEADING: Partial<Record<ResourceKind, string>> = {
  chapter: "Chapters",
  video: "Lectures",
  code: "Repositories",
  site: "Pages",
  paper: "Papers",
  blog: "Posts",
};

/** What the list is a list of, taken from what most of it is made of. */
function itemHeading(items: SourceItem[]): string {
  const counts = new Map<ResourceKind, number>();
  for (const item of items) counts.set(item.resource.kind, (counts.get(item.resource.kind) ?? 0) + 1);
  let best: ResourceKind | null = null;
  for (const [kind, count] of counts) if (!best || count > (counts.get(best) ?? 0)) best = kind;
  return (best && ITEM_HEADING[best]) ?? "Readings";
}

interface SourceViewProps {
  station: Station;
  line: Line;
  log: LogEntry[];
  resources: Record<string, boolean>;
  colour: string;
  done: number;
  complete: boolean;
  saveError: boolean;
  prev: Station | null;
  next: Station | null;
  onToggle: (resourceId: string) => void;
  onSelect: (id: string) => void;
}

/**
 * A station that holds a whole book or course. Nothing here is a claim about
 * the reader — no status to set, no skills to declare — because the station is
 * the source itself. One list of everything it is made of, in the order the
 * map hands it to you, each part saying which stop teaches it.
 */
function SourceView(props: SourceViewProps) {
  const { station, line, log, resources, colour, done, complete, saveError, prev, next, onToggle, onSelect } = props;
  // The whole thing, as opposed to a part of it: the PDF, the course page, the
  // homepage that is not on anyone's reading list.
  const links = station.resources.filter(
    (r) => r.kind === "book" || r.kind === "course" || (r.kind === "site" && r.role === "optional"),
  );
  const items: SourceItem[] = [
    ...station.resources.filter((r) => !links.includes(r)).map((resource) => ({ resource, at: null })),
    ...log.map((entry) => ({ resource: entry.resource, at: { station: entry.station, line: entry.line } })),
  ];
  const total = station.resources.length + log.length;
  const itemsDone = items.filter((item) => resources[item.resource.id]).length;
  const word = sourceWord(station);
  // The one requirement worth keeping in words now that the groups are gone.
  const picks = station.resources.filter((r) => r.role === "pick").length;

  return (
    <div className="px-5 pt-4">
      <p className="text-[13px] text-ink-soft leading-snug">{station.meta}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cx(
            "inline-block flex-none rounded-full px-2.5 py-1 text-[11px] text-white uppercase tracking-[0.08em]",
            TAG_STYLE[station.tag],
          )}
        >
          {TAG_LABEL[station.tag]}
        </span>
        <span className="text-[12px] text-ink-faint leading-snug">{TAG_NOTE[station.tag]}</span>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[13px]">
        <span className={cx(complete && "font-bold")} style={complete ? { color: colour } : undefined}>
          {complete ? `Whole ${word} complete` : `Whole ${word} · ${done} of ${total}`}
        </span>
        {complete ? <Tick className="size-3.5" style={{ color: colour }} /> : null}
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bar">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${(100 * done) / total}%`, background: colour }}
        />
      </div>
      {saveError ? <p className="mt-1.5 text-[12px] text-tfl-red">Could not save to browser storage.</p> : null}

      <p className="mt-4 text-[14.5px] leading-normal">{station.idea}</p>
      <p className="mt-2 text-[12px] text-ink-faint leading-snug">
        Tick a part here or at the stop that teaches it — it is the same tick either way.
      </p>

      {links.length > 0 && (
        <>
          <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">
            {sourceHeading(station)}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {links.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                done={Boolean(resources[resource.id])}
                colour={colour}
                onToggle={() => onToggle(resource.id)}
              />
            ))}
          </ul>
        </>
      )}

      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">
        {itemHeading(items)} · {itemsDone} / {items.length}
      </h3>
      {picks > 1 && (
        <p className="mb-1.5 text-[11.5px] text-ink-faint">
          One of these is enough for this stop. The rest are there when a project asks for them.
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <SourceRow
            key={item.resource.id}
            item={item}
            done={Boolean(resources[item.resource.id])}
            colour={item.at ? TFL_COLOURS[item.at.line.tfl] : colour}
            onToggle={() => onToggle(item.resource.id)}
            onSelect={onSelect}
          />
        ))}
      </ul>

      {/* No Connections here: every part above already names the stop that teaches it. */}
      <PanelTail station={station} line={line} connections={[]} prev={prev} next={next} onSelect={onSelect} />
    </div>
  );
}

/** A title and its "opens elsewhere" mark, which never wraps away from it. */
function LinkLabel({ label }: { label: string }) {
  const cut = label.lastIndexOf(" ");
  return (
    <>
      {cut === -1 ? null : label.slice(0, cut + 1)}
      <span className="whitespace-nowrap">
        {cut === -1 ? label : label.slice(cut + 1)}
        <ArrowTopRightOnSquareIcon className="ml-1 inline size-3 align-[-1px] text-ink-faint" />
      </span>
    </>
  );
}

function SourceRow({
  item,
  done,
  colour,
  onToggle,
  onSelect,
}: {
  item: SourceItem;
  done: boolean;
  colour: string;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const { resource, at } = item;
  return (
    <li
      className={cx(
        "flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition",
        done ? "border-transparent bg-tint" : "border-rule bg-surface",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark ${resource.label} not done` : `Mark ${resource.label} done`}
        className="mt-px flex size-5 flex-none items-center justify-center rounded-full border-2 text-white transition"
        style={{ borderColor: colour, background: done ? colour : "var(--surface)" }}
      >
        {done ? <Tick className="size-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cx("block text-[13.5px] leading-snug underline-offset-2 hover:underline", done && "text-ink-soft")}
        >
          <LinkLabel label={resource.label} />
        </a>
        {at ? (
          <button
            type="button"
            onClick={() => onSelect(at.station.id)}
            title={`${at.line.name}: ${at.station.title}`}
            className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-1 text-[11.5px] text-ink-soft hover:bg-tint-strong"
          >
            <span className="relative -top-px size-2 flex-none rounded-full" style={{ background: colour }} />
            <span className="truncate">
              {at.line.phase} · {at.station.name}
            </span>
            <ArrowRightIcon className="relative -top-px size-3 flex-none text-ink-faint" />
          </button>
        ) : (
          <span className="mt-1 block text-[11.5px] text-ink-faint">This stop</span>
        )}
      </div>
      <KindBadge kind={resource.kind} compact className="mt-px" />
    </li>
  );
}

/** Everything below a station's own business: where it points, and where to go next. */
function PanelTail({
  station,
  line,
  connections,
  prev,
  next,
  idea = false,
  onSelect,
}: {
  station: Station;
  line: Line;
  connections: Connection[];
  prev: Station | null;
  next: Station | null;
  idea?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {idea ? (
        <>
          <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Key idea</h3>
          <p className="text-[14.5px] leading-normal">{station.idea}</p>
        </>
      ) : null}
      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Forward link</h3>
      <p className="text-[14.5px] leading-normal">{station.fwd}</p>

      {connections.length > 0 && (
        <>
          <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">Connections</h3>
          <div className="flex flex-wrap gap-1.5">
            {connections.map((c) => (
              <button
                key={c.station.id}
                type="button"
                onClick={() => onSelect(c.station.id)}
                title={`${c.line.name}: ${c.station.title}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-tint py-1 pr-2.5 pl-1.5 text-[12.5px] hover:bg-tint-strong"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    background: TFL_COLOURS[c.line.tfl],
                    boxShadow: c.read ? "inset 0 0 0 2px var(--surface)" : undefined,
                  }}
                />
                {c.station.name}
                {c.direction === "to" ? (
                  <ArrowRightIcon className="size-3 text-ink-faint" />
                ) : (
                  <ArrowLeftIcon className="size-3 text-ink-faint" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="mt-5 mb-1.5 text-[11px] text-ink-faint uppercase tracking-[0.1em]">About this line</h3>
      <p className="text-[13px] text-ink-soft leading-normal">{line.goal}</p>

      <div className="mt-5 flex justify-between gap-2">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onSelect(prev.id)}
          className="flex flex-1 items-center gap-1.5 rounded-full bg-tint px-3.5 py-2 text-left text-[13px] hover:bg-tint-strong disabled:cursor-default disabled:opacity-40"
        >
          <ArrowLeftIcon className="size-3.5 flex-none" />
          <span className="truncate">{prev ? prev.name : "Start of line"}</span>
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && onSelect(next.id)}
          className="flex flex-1 items-center justify-end gap-1.5 rounded-full bg-tint px-3.5 py-2 text-right text-[13px] hover:bg-tint-strong disabled:cursor-default disabled:opacity-40"
        >
          <span className="truncate">{next ? next.name : "End of line"}</span>
          <ArrowRightIcon className="size-3.5 flex-none" />
        </button>
      </div>
    </>
  );
}

function ResourceRow({
  resource,
  done,
  colour,
  onToggle,
}: {
  resource: Resource;
  done: boolean;
  colour: string;
  onToggle: () => void;
}) {
  return (
    <li
      className={cx(
        "flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition",
        done ? "border-transparent bg-tint" : "border-rule bg-surface",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark ${resource.label} not done` : `Mark ${resource.label} done`}
        className="flex size-5 flex-none items-center justify-center rounded-full border-2 text-white transition"
        style={{ borderColor: colour, background: done ? colour : "var(--surface)" }}
      >
        {done ? <Tick className="size-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cx("block text-[13.5px] leading-snug underline-offset-2 hover:underline", done && "text-ink-soft")}
        >
          <LinkLabel label={resource.label} />
        </a>
      </div>
      <KindBadge kind={resource.kind} className="mt-px" />
    </li>
  );
}
