import Link from "next/link";
import { Roundel } from "@/components/Roundel";

export default function CurriculumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="curriculum-reader h-full overflow-y-auto bg-paper">
      <div className="mx-auto max-w-4xl px-5 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(3rem+var(--safe-bottom))] sm:px-8">
        <nav aria-label="Main navigation" className="mb-10 flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/" prefetch={false} className="flex items-center gap-2 text-tfl-blue">
            <Roundel className="size-8" />
            RL on Rails
          </Link>
          <div className="flex gap-5">
            <Link href="/curriculum" prefetch={false}>
              Curriculum
            </Link>
            <Link href="/" prefetch={false}>
              Interactive map
            </Link>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="mt-14 border-rule border-t pt-5 text-ink-soft text-sm">
          Curated by <a href="https://subeenregmi.com">Subeen Regmi</a>. Follow your reading and exercises on the{" "}
          <Link href="/" prefetch={false}>
            interactive map
          </Link>
          ; progress stays in your browser.
        </footer>
      </div>
    </div>
  );
}
