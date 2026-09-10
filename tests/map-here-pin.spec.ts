import { expect, test, type Page } from "@playwright/test";

const pin = ".here-pin";
// The station panel's width off a phone, from StationPanel's own class list.
const PANEL_W = 380;

/** How far off the station it marks the pin's arrow points, in degrees. */
async function aim(page: Page) {
  return page.evaluate(() => {
    const box = document.querySelector<HTMLElement>(".here-pin")!.getBoundingClientRect();
    const here = document.querySelector<SVGGElement>(".station.here .hit")!.getBoundingClientRect();
    const rotation = Number(/rotate\(([-\d.]+)deg\)/.exec(document.querySelector<HTMLElement>(".here-pin-arrow")!.style.transform)![1]);
    const dx = here.x + here.width / 2 - (box.x + box.width / 2);
    const dy = here.y + here.height / 2 - (box.y + box.height / 2);
    const wanted = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return (((rotation - wanted) % 360) + 540) % 360 - 180;
  });
}

const markerBox = (page: Page) => page.locator(".you-are-here").evaluate((el) => el.getBoundingClientRect().toJSON());

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.mouse.up();
  await expect(page.locator(".map-svg")).not.toHaveClass(/moving/, { timeout: 10_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".intro, .intro-lite")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".map-svg")).not.toHaveClass(/moving/);
});

test("the pin raises when the marker leaves the screen and flies the camera back", async ({ page }) => {
  await expect(page.locator(pin)).not.toHaveClass(/shown/);

  await drag(page, { x: 700, y: 500 }, { x: 120, y: 240 });
  const gone = await markerBox(page);
  expect(gone.right).toBeLessThan(0);
  await expect(page.locator(pin)).toHaveClass(/shown/);
  // It rides the edge of the map, pointing the way back.
  const box = (await page.locator(pin).boundingBox())!;
  const { width, height } = page.viewportSize()!;
  expect(Math.min(box.x, box.y, width - box.x - box.width, height - box.y - box.height)).toBeLessThan(80);
  expect(Math.abs(await aim(page))).toBeLessThan(1);

  await page.locator(pin).click();
  await expect(page.locator(".map-svg")).not.toHaveClass(/moving/, { timeout: 10_000 });
  const back = await markerBox(page);
  expect(back.left).toBeGreaterThan(0);
  expect(back.right).toBeLessThan(width);
  await expect(page.locator(pin)).not.toHaveClass(/shown/);
});

test.describe("beside the station panel", () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test("a marker covered by the panel raises the pin at the panel's edge", async ({ page }) => {
    const station = await page.locator('.station[data-id="p1-mc"] .hit').evaluate((el) => {
      const box = el.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await page.mouse.click(station.x, station.y);
    await expect(page.locator(".panel-open")).toHaveCount(1);
    await expect(page.locator(pin)).not.toHaveClass(/shown/);

    // Push the marker under the panel: still on the map, but not to be seen.
    await drag(page, { x: 120, y: 500 }, { x: 660, y: 500 });
    const covered = await markerBox(page);
    expect(covered.left).toBeGreaterThan(900 - PANEL_W);
    await expect(page.locator(pin)).toHaveClass(/shown/);
    const box = (await page.locator(pin).boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(900 - PANEL_W);
    expect(Math.abs(await aim(page))).toBeLessThan(1);
  });
});
