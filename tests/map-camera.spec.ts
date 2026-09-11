import { expect, type Page, test } from "@playwright/test";
import { CURRICULUM } from "../src/lib/curriculum";

const readStations = CURRICULUM.lines.flatMap((line) => line.stations).slice(0, 60);
const station = '.station[data-id="p1-mc"]';
const MOVING = /moving/;
const SELECTED = /selected/;
const MAP_DRAGGING = /map-dragging/;

function stationCentre(page: Page) {
  return page.locator(`${station} .hit`).evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (ids) => {
      localStorage.setItem(
        "rl-underground.progress",
        JSON.stringify({
          stations: Object.fromEntries(
            ids.map((id) => [
              id,
              {
                status: "read",
                readAt: "2026-09-01",
                updatedAt: null,
                skills: [],
                deliverables: [],
              },
            ]),
          ),
          resources: {},
          tracks: [],
        }),
      );
    },
    readStations.map((s) => s.id),
  );
  await page.goto("/");
  await expect(page.locator(".station.read")).toHaveCount(60);
  await expect(page.locator(".intro, .intro-lite")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".map-svg")).not.toHaveClass(MOVING);
});

test("clicking a read station during wheel settling resumes the map", async ({ page }) => {
  // Hold the 160ms wheel timeout so the click always exercises the race.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  const point = await stationCentre(page);
  await page.locator(".map-svg").dispatchEvent("wheel", {
    clientX: point.x,
    clientY: point.y,
    deltaY: -12,
    ctrlKey: true,
  });
  await page.clock.runFor(20);
  const zoomed = await stationCentre(page);
  await page.mouse.click(zoomed.x, zoomed.y);
  await page.clock.runFor(500);
  await expect(page.locator(station)).toHaveClass(SELECTED);
  await expect(page.locator(".map-svg")).not.toHaveClass(MOVING);
  await expect(page.locator(".map-svg")).toHaveCSS("transform", "none");
  await expect(page.locator(".track-next").first()).toHaveCSS("animation-play-state", "running");
});

test("zoom stays anchored and sharp across the old raster rebase thresholds", async ({ page }) => {
  const centre = await stationCentre(page);
  // WheelEvent exposes integer client coordinates. Track the map point under
  // that actual pointer, rather than a station's fractional screen centre.
  const point = { x: Math.round(centre.x), y: Math.round(centre.y) };
  await page.mouse.click(point.x, point.y);
  const frames = await page.evaluate(async (pointer) => {
    const svg = document.querySelector<SVGSVGElement>(".map-svg")!;
    const anchor = new DOMPoint(pointer.x, pointer.y).matrixTransform(svg.getScreenCTM()!.inverse());
    const samples: { x: number; y: number; width: number; viewportRatio: number; transform: string }[] = [];
    for (const deltaY of [...new Array(30).fill(-4), ...new Array(30).fill(4)]) {
      svg.dispatchEvent(
        new WheelEvent("wheel", {
          clientX: pointer.x,
          clientY: pointer.y,
          deltaY,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await new Promise(requestAnimationFrame);
      const screen = anchor.matrixTransform(svg.getScreenCTM()!);
      const wrap = svg.parentElement!.getBoundingClientRect();
      samples.push({
        x: screen.x,
        y: screen.y,
        width: svg.viewBox.baseVal.width,
        viewportRatio: svg.getBoundingClientRect().width / wrap.width,
        transform: getComputedStyle(svg).transform,
      });
    }
    return samples;
  }, point);
  for (const [index, frame] of frames.entries()) {
    expect(Math.abs(frame.x - point.x)).toBeLessThan(0.2);
    expect(Math.abs(frame.y - point.y)).toBeLessThan(0.2);
    expect(frame.transform).toBe("none");
    expect(frame.viewportRatio).toBeCloseTo(1);
    if (index > 0 && index < 30) expect(frame.width).toBeLessThan(frames[index - 1].width);
    if (index >= 30) expect(frame.width).toBeGreaterThan(frames[index - 1].width);
  }
  await expect(page.locator(".map-svg")).not.toHaveClass(MOVING);
  const settled = await stationCentre(page);
  expect(settled.x).toBeCloseTo(centre.x, 1);
  expect(settled.y).toBeCloseTo(centre.y, 1);
});

test("a burst of wheel input paints once and a drag settles without selecting", async ({ page }) => {
  const writes = await page.locator(".map-svg").evaluate(async (svg) => {
    let viewBoxWrites = 0;
    const observer = new MutationObserver((records) => {
      viewBoxWrites += records.length;
    });
    observer.observe(svg, { attributes: true, attributeFilter: ["viewBox"] });
    for (let i = 0; i < 8; i++) {
      svg.dispatchEvent(
        new WheelEvent("wheel", {
          clientX: 700,
          clientY: 450,
          deltaY: -2,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    observer.disconnect();
    return viewBoxWrites;
  });
  expect(writes).toBe(1);
  const point = await stationCentre(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 80, point.y + 40, { steps: 8 });
  await expect.poll(async () => (await stationCentre(page)).x).toBeCloseTo(point.x + 80, 0);
  await page.mouse.up();
  await expect(page.locator(".map-svg")).not.toHaveClass(MOVING, { timeout: 10_000 });
  await expect(page.locator(".station.selected")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(MAP_DRAGGING);
});

test.describe("touch camera", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

  test("a two-finger pinch zooms the map and settles on release", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP dispatches a real multi-touch gesture in Chromium.");
    const session = await page.context().newCDPSession(page);
    const width = () => page.locator(".map-svg").evaluate((svg) => (svg as SVGSVGElement).viewBox.baseVal.width);
    const before = await width();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 145, y: 400, id: 1 },
        { x: 245, y: 400, id: 2 },
      ],
    });
    for (let i = 1; i <= 6; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: 145 - i * 10, y: 400, id: 1 },
          { x: 245 + i * 10, y: 400, id: 2 },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await width()).toBeLessThan(before * 0.6);
    await expect(page.locator(".map-svg")).not.toHaveClass(MOVING);
    expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
    await session.detach();
  });
});
