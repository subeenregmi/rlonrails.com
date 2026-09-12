import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/16/solid";
import Link from "next/link";
import { Roundel } from "@/components/Roundel";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-col overflow-y-auto bg-paper text-ink">
      <div className="mx-auto flex w-[880px] max-w-full flex-1 flex-col gap-5 pt-[calc(1.25rem+var(--safe-top))] pr-[calc(1rem+var(--safe-right))] pb-[calc(2rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] sm:pt-[calc(2rem+var(--safe-top))] sm:pr-[calc(1.5rem+var(--safe-right))] sm:pl-[calc(1.5rem+var(--safe-left))]">
        <Link href="/" className="flex items-center gap-3 self-start text-[15px] uppercase tracking-[0.07em]">
          <Roundel className="size-9" />
          RL on Rails
        </Link>

        <section className="flex flex-1 flex-col items-center justify-center gap-8 py-8 text-center">
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-surface shadow-[0_14px_40px_rgba(0,0,0,.12)]">
            <header className="bg-tfl-blue px-6 py-4 text-white shadow-[inset_0_-3px_0_#E32017]">
              <p className="text-[11px] text-white/70 uppercase tracking-[0.2em]">Service update</p>
              <h1 className="text-[22px] uppercase tracking-[0.08em] sm:text-[28px]">Station not found</h1>
            </header>
            <div className="flex flex-col items-center gap-3 px-6 py-8">
              <p className="text-[64px] text-tfl-blue leading-none">404</p>
              <p className="text-[15px] text-ink-soft">
                This stop is not on the RL on Rails map. Please check the destination and travel back to a served
                station.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full bg-tfl-blue px-4 py-2 text-[13px] text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-tfl-blue focus-visible:ring-offset-2"
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to the map
            </Link>
            <Link
              href="/journey"
              className="flex items-center gap-1.5 rounded-full bg-tint px-3.5 py-2 text-[13px] hover:bg-tint-strong"
            >
              View journey
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
