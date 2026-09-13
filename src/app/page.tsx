import { RLUnderground } from "@/components/RLUnderground";
import { StructuredData } from "@/components/StructuredData";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata = pageMetadata("Reinforcement Learning Roadmap", SITE_DESCRIPTION, "/");

export default function Home() {
  return (
    <>
      <h1 className="sr-only">Reinforcement learning roadmap</h1>
      <RLUnderground />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
        }}
      />
    </>
  );
}
