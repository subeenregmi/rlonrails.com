import type { ComponentType, SVGProps } from "react";
import type { ResourceKind, Station } from "./curriculum";
import { cx } from "./cx";
import {
  AcademicCapIcon, BookOpenIcon, BookmarkIcon, CodeBracketIcon, DocumentTextIcon, GlobeAltIcon, NewspaperIcon, PlayCircleIcon,
} from "@heroicons/react/16/solid";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const KIND_LABEL: Record<ResourceKind, string> = {
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
export const KIND_ICON: Record<ResourceKind, Icon> = {
  paper: DocumentTextIcon,
  chapter: BookmarkIcon,
  book: BookOpenIcon,
  video: PlayCircleIcon,
  course: AcademicCapIcon,
  code: CodeBracketIcon,
  blog: NewspaperIcon,
  site: GlobeAltIcon,
};

/**
 * What a station whose material is scattered across the map *is*: the most
 * telling kind among its own resources. A stop holding a book reads as a book
 * wherever it is listed, so the map's sources can be told apart without
 * opening them.
 */
const SOURCE_ORDER: ResourceKind[] = ["book", "course", "code", "video", "site", "paper", "blog", "chapter"];
export const sourceKind = (station: Station): ResourceKind =>
  SOURCE_ORDER.find((kind) => station.resources.some((r) => r.kind === kind)) ?? "site";

/** What to call the whole of a source in a sentence: "Whole book complete". */
const SOURCE_WORD: Partial<Record<ResourceKind, string>> = { book: "book", course: "course", video: "series" };
export const sourceWord = (station: Station) => SOURCE_WORD[sourceKind(station)] ?? "set";

/** A heading for the links to the whole thing, where "the set" would not do. */
export const sourceHeading = (station: Station) => {
  const word = SOURCE_WORD[sourceKind(station)];
  return word ? `The ${word}` : "The source";
};

/**
 * The kind, as a colour and a shape. `compact` drops the word where a row is
 * already carrying a station beside it; the label stays in the accessible name
 * either way.
 */
export function KindBadge({ kind, compact = false, className }: { kind: ResourceKind; compact?: boolean; className?: string }) {
  const Icon = KIND_ICON[kind];
  return (
    <span
      title={KIND_LABEL[kind]}
      className={cx(
        "inline-flex flex-none items-center rounded-full text-[10px] uppercase tracking-[0.06em]",
        compact ? "h-5 w-5 justify-center" : "gap-1 px-2 py-0.5",
        KIND_STYLE[kind],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className={cx(compact && "sr-only")}>{KIND_LABEL[kind]}</span>
    </span>
  );
}
