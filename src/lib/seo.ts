import type { Metadata } from "next";

export const SITE_URL = "https://rlonrails.com";
export const SITE_NAME = "RL on Rails";
export const SITE_DESCRIPTION =
  "Learn reinforcement learning with an interactive roadmap, curated papers, courses and coding exercises. Follow the curriculum from foundations to RLHF and research.";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      locale: "en_GB",
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: "RL on Rails reinforcement learning roadmap" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [{ url: "/opengraph-image", alt: "RL on Rails reinforcement learning roadmap" }],
    },
  };
}
