import type { MetadataRoute } from "next";
import { CURRICULUM } from "@/lib/curriculum";
import { curriculumPath } from "@/lib/curriculum-routes";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // No synthetic lastModified dates: a rebuild does not mean the content changed.
  return ["", "/curriculum", ...CURRICULUM.lines.map(curriculumPath)].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
}
