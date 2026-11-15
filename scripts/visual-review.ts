import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch();
const checks: Record<string, unknown>[] = [];
mkdirSync("docs/screenshots", { recursive: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    const page = await browser.newPage({ viewport });
    for (const [route, name] of [
      ["/", "home"],
      ["/rooms/new", "create"],
      ["/join", "join"],
    ]) {
      await page.goto(`http://localhost:5173${route}`);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        headingFont: getComputedStyle(document.querySelector("h1")!).fontFamily,
        bodyFont: getComputedStyle(document.body).fontFamily,
      }));
      checks.push({ route, viewport, ...geometry });
      if (geometry.overflow)
        throw new Error(`Overflow em ${route} / ${viewport.width}px`);
      if (viewport.width !== 360)
        await page.screenshot({
          path: `docs/screenshots/${name}-${viewport.width}.png`,
          fullPage: true,
        });
    }
    await page.close();
  }
  writeFileSync(
    "docs/visual-review-result.json",
    JSON.stringify({ at: new Date().toISOString(), checks }, null, 2),
  );
  console.log({ views: checks.length, horizontalOverflows: 0 });
} finally {
  await browser.close();
}
