import Link from "next/link";
import { RLUnderground } from "@/components/RLUnderground";
import { StructuredData } from "@/components/StructuredData";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata = pageMetadata("Reinforcement Learning Roadmap", SITE_DESCRIPTION, "/");

export default function Home() {
  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex items-center justify-between gap-3 border-rule border-b bg-paper pt-[calc(0.5rem+var(--safe-top))] pr-[calc(1rem+var(--safe-right))] pb-2 pl-[calc(1rem+var(--safe-left))]">
        <div>
          <h1 className="text-sm sm:text-base">Reinforcement learning roadmap</h1>
          <p className="hidden text-ink-soft text-xs sm:block">
            Curated papers, courses and exercises, from foundations to research.
          </p>
        </div>
        <Link
          href="/curriculum"
          prefetch={false}
          className="shrink-0 rounded-full bg-tfl-blue px-3 py-2 text-white text-xs hover:underline"
        >
          Read the curriculum
        </Link>
      </header>
      <div className="min-h-0">
        <RLUnderground />
      </div>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
        }}
      />
    </div>
  );
}
