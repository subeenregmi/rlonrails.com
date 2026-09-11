import { expect, type Page, test } from "@playwright/test";

const cs285 = "p0-cs285";
const daydreamer = "p6h-daydreamer";
const MOVING = /moving/;
const SELECTED = /selected/;

function centre(page: Page, id: string) {
  return page.locator(`.station[data-id="${id}"] .hit`).evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((id) => {
    localStorage.setItem(
      "rl-underground.progress",
      JSON.stringify({
        stations: { [id]: { status: "read", readAt: "2026-09-01", updatedAt: null, skills: [], deliverables: [] } },
        resources: {},
        tracks: [],
      }),
    );
  }, cs285);
  await page.goto("/");
  await expect(page.locator(".station.read")).toHaveCount(1);
  await expect(page.locator(".intro, .intro-lite")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".map-svg")).not.toHaveClass(MOVING);

  // Put these two stations in the exposed part of the map, then zoom until
  // they fill its height. CS285's 20 connections mostly extend offscreen.
  const a = await centre(page, cs285);
  const b = await centre(page, daydreamer);
  const map = page.locator(".map-svg");
  await map.dispatchEvent("wheel", {
    clientX: 700,
    clientY: 460,
    deltaX: (a.x + b.x) / 2 - 700,
    deltaY: (a.y + b.y) / 2 - 460,
  });
  await expect(map).not.toHaveClass(MOVING);
  await map.dispatchEvent("wheel", { clientX: 700, clientY: 460, deltaY: -130, ctrlKey: true });
  await expect(map).not.toHaveClass(MOVING);
});

test("close-up CS285 and DayDreamer switches preserve the camera and fade connections", async ({ page }) => {
  const map = page.locator(".map-svg");
  const viewBox = await map.getAttribute("viewBox");
  for (const id of [cs285, daydreamer, cs285, daydreamer]) {
    const point = await centre(page, id);
    await page.mouse.click(point.x, point.y);
    await expect(page.locator(`.station[data-id="${id}"]`)).toHaveClass(SELECTED);
    await expect(map).toHaveAttribute("viewBox", viewBox!);
    const active = page.locator(".link.active");
    await expect(active).toHaveCount(id === cs285 ? 20 : 1);
    await expect(active.first()).toHaveCSS("stroke-opacity", "1");
    await expect(active.first()).toHaveCSS("visibility", "visible");
    await expect(active.first()).toHaveCSS("animation-play-state", "running");
    await expect(page.locator(".link:not(.active)").first()).toHaveCSS("visibility", "hidden");
  }
});

test("switching the close-up stations does not replace large map compositor layers", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "LayerTree instrumentation requires Chromium CDP.");
  const session = await page.context().newCDPSession(page);
  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".map-svg" });
  const { node } = await session.send("DOM.describeNode", { nodeId });
  const largeLayers = new Set<string>();
  let samples = 0;
  session.on("LayerTree.layerTreeDidChange", ({ layers }) => {
    for (const layer of layers ?? []) {
      if (
        layer.backendNodeId === node.backendNodeId &&
        layer.drawsContent &&
        layer.width * layer.height > 1440 * 1000 * 2
      ) {
        largeLayers.add(layer.layerId);
        samples++;
      }
    }
  });
  await session.send("LayerTree.enable");
  for (const id of [cs285, daydreamer, cs285, daydreamer]) {
    const point = await centre(page, id);
    await page.mouse.click(point.x, point.y);
    // Observe the transition itself, not just a settled screenshot. The old
    // opacity/hover combination replaced the large map layers on every click.
    await page.waitForTimeout(500);
  }
  expect(samples).toBeGreaterThan(0);
  expect(largeLayers.size).toBe(1);
  await session.detach();
});
