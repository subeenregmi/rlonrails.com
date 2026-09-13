import { expect, test } from "@playwright/test";
import { CURRICULUM } from "../src/lib/curriculum";
import { curriculumPath } from "../src/lib/curriculum-routes";
import { SITE_URL } from "../src/lib/seo";

test("sitemap exposes every public topic and excludes personal progress", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(CURRICULUM.lines.length + 2);
  expect(xml).not.toContain("/journey");
  expect(xml).not.toContain("<lastmod>");
  for (const line of CURRICULUM.lines) {
    const path = curriculumPath(line);
    expect(xml).toContain(`${SITE_URL}${path}`);
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="${SITE_URL}${path}"`);
    expect(html).toContain('"@type":"BreadcrumbList"');
    for (const station of line.stations) expect(html).toContain(`id="${station.id}"`);
  }
});

test("development and personal pages are noindex while production stays indexable", async ({ request }) => {
  const production = await request.get("/", { headers: { host: "rlonrails.com" } });
  expect(production.headers()["x-robots-tag"]).toBeUndefined();
  const development = await request.get("/", { headers: { host: "dev.rlonrails.com" } });
  expect(development.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const journey = await request.get("/journey");
  expect(await journey.text()).toContain('name="robots" content="noindex, follow"');
  const missing = await request.get("/curriculum/not-a-topic");
  expect(missing.status()).toBe(404);
});

test("homepage discovery and topic reading work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reinforcement learning roadmap");
  await page.getByRole("link", { name: "Read the curriculum" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reinforcement learning curriculum");
  await page.getByRole("link", { name: "Foundations", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Foundations");
  const foundation = CURRICULUM.lines.find((line) => line.id === "p1")!;
  const station = foundation.stations[0];
  await page.getByRole("link", { name: station.title, exact: true }).first().click();
  await expect(page.locator(`#${station.id}`)).toBeInViewport();
  await expect(page.getByRole("link", { name: station.resources[0].label, exact: true }).first()).toHaveAttribute(
    "href",
    station.resources[0].url,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});

test("share image and performance collection are available", async ({ page, request }) => {
  await page.goto("/curriculum");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${SITE_URL}/curriculum`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(imageUrl).toBeTruthy();
  const image = await request.get(new URL(imageUrl!).pathname);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  await expect(page.locator('script[src="https://umami.subeenregmi.com/script.js"]')).toHaveAttribute(
    "data-performance",
    "true",
  );
});
