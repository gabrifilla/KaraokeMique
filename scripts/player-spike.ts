import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await page.goto("http://localhost:5173");
  await page.evaluate(() => {
    (window as any).__probe = { events: [] };
    const p = (window as any).__probe;
    const div = document.createElement("div");
    div.id = "spike-player";
    document.body.replaceChildren(div);
    (window as any).onYouTubeIframeAPIReady = () => {
      (window as any).__player = new (window as any).YT.Player(div, {
        width: 640,
        height: 360,
        videoId: "M7lc1UVf-VE",
        playerVars: { origin: location.origin, fs: 0 },
        events: {
          onReady: () => {
            p.ready = true;
          },
          onStateChange: (e: any) => p.events.push(e.data),
          onError: (e: any) => (p.error = e.data),
          onAutoplayBlocked: () => (p.autoplayBlocked = true),
        },
      });
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => (p.scriptError = true);
    document.head.append(script);
  });
  try {
    await page.waitForFunction(
      () =>
        (window as any).__probe.ready ||
        (window as any).__probe.error ||
        (window as any).__probe.scriptError,
      {},
      { timeout: 15000 },
    );
  } catch {}
  await page.evaluate(() => {
    const btn = document.createElement("button");
    btn.textContent = "Iniciar prova";
    btn.onclick = () => (window as any).__player?.playVideo();
    document.body.append(btn);
  });
  await page.getByRole("button", { name: "Iniciar prova" }).click();
  try {
    await page.waitForFunction(
      () =>
        (window as any).__probe.events.includes(1) ||
        (window as any).__probe.error,
      {},
      { timeout: 15000 },
    );
  } catch {}
  const observed = await page.evaluate(() => (window as any).__probe);
  const report = {
    at: new Date().toISOString(),
    browser: "Chromium headless, origin http://localhost:5173",
    video: "M7lc1UVf-VE (exemplo da documentação IFrame)",
    observed,
    limitations:
      "Não comprova som em TV, autoplay de aparelhos físicos, término natural ou disponibilidade de vídeos de karaokê.",
  };
  writeFileSync(
    "docs/player-spike-result.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}
