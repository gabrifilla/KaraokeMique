import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const base = process.env.SPIKE_ORIGIN || "http://localhost:5175";
const browser = await chromium.launch();
const checks: any[] = [];
try {
  const hostContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const stageContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const host = await hostContext.newPage(),
    stage = await stageContext.newPage();
  await host.goto(`${base}/rooms/new`);
  await host.getByLabel("Como a galera te chama?").fill("Prova real");
  const createResponse = host.waitForResponse(
    (r) => r.url().endsWith("/api/v1/rooms") && r.request().method() === "POST",
  );
  await host.getByRole("button", { name: "Criar minha sala" }).click();
  const created = await createResponse;
  checks.push({ name: "Criar sala para prova real", status: created.status() });
  if (!created.ok()) throw new Error("Não foi possível criar a sala de prova.");
  await host.getByRole("heading", { name: "A festa vai começar" }).waitFor();

  await host.getByRole("link", { name: "Palco", exact: true }).click();
  await host.getByText("Outras formas de conectar", { exact: true }).click();
  await host.getByRole("button", { name: "Autorizar palco" }).click();
  const code = await host.locator(".pair-code").textContent();
  await stage.goto(`${base}/stage/pair`);
  await stage.getByLabel("Código autorizado pelo anfitrião").fill(code!);
  await stage.getByRole("button", { name: "Conectar esta tela" }).click();
  await stage.locator(".qr svg").waitFor();
  await host.getByRole("link", { name: "Buscar", exact: true }).click();
  await host.getByLabel("Música ou artista").fill("right through me");
  const searchResponse = host.waitForResponse((r) =>
    r.url().includes("/music/search"),
  );
  await host.getByRole("button", { name: "Buscar", exact: true }).click();
  const response = await searchResponse;
  const results = await response.json();
  checks.push({
    name: "Busca YouTube pela aplicação",
    status: response.status(),
    items: results.items?.length,
    mode: results.mode,
    firstVideoId: results.items?.[0]?.id,
  });
  if (!results.items?.length)
    throw new Error("Busca não retornou vídeos utilizáveis");
  await host
    .locator(".song")
    .first()
    .getByRole("button", { name: "Adicionar" })
    .click();
  await host.getByRole("button", { name: "Confirmar", exact: true }).click();
  await host.getByRole("link", { name: "Sala", exact: true }).click();
  try {
    await stage.locator("[data-state=PLAYING]").waitFor({ timeout: 15000 });
    checks.push({
      name: "Player real sem clique para tocar",
      autoplay: true,
      playing: true,
    });
  } catch {
    checks.push({
      name: "Player real sem clique para tocar",
      autoplay: false,
      playing: false,
      notice: await stage.locator(".notice").allTextContents(),
    });
  }
  await host.getByRole("button", { name: "Buscar um GIF" }).click();
  await host.getByLabel("Encontre sua reação").fill("applause");
  const gifsResponse = host.waitForResponse((r) =>
    r.url().startsWith("https://api.giphy.com/v1/gifs/search"),
  );
  await host.getByRole("button", { name: "Buscar GIFs" }).click();
  const gifs = await gifsResponse;
  const gifData = await gifs.json();
  checks.push({
    name: "Busca GIPHY direta do browser",
    status: gifs.status(),
    items: gifData.data?.length,
  });
  if (gifData.data?.length) {
    const resolveResponse = stage.waitForResponse(
      (r) =>
        r
          .url()
          .startsWith(`https://api.giphy.com/v1/gifs/${gifData.data[0].id}?`),
      { timeout: 15000 },
    );
    await host.locator(".gif-grid button").first().click();
    const resolved = await resolveResponse;
    await stage
      .locator(".gif-spotlight img")
      .first()
      .waitFor({ timeout: 5000 });
    await stage.waitForFunction(
      () =>
        Array.from(
          document.querySelectorAll<HTMLImageElement>(".gif-spotlight img"),
        ).some((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 4500 },
    );
    const rendered = await stage
      .locator(".gif-spotlight img")
      .first()
      .evaluate((img: HTMLImageElement) => ({
        loaded: img.complete && img.naturalWidth > 0,
        srcHost: new URL(img.src).hostname,
      }));
    checks.push({
      name: "Compartilhamento GIF por ID e resolução no palco",
      status: resolved.status(),
      ...rendered,
    });
  }
  await stage.screenshot({ path: "docs/screenshots/real-stage.png" });
  const frame = stage
    .frames()
    .find((f) => f.url().includes("youtube.com/embed"));
  if (frame) {
    const seek = await frame.evaluate(() => {
      const video = document.querySelector("video");
      if (video && Number.isFinite(video.duration)) {
        video.currentTime = Math.max(0, video.duration - 2);
        return true;
      }
      return false;
    });
    if (seek) {
      try {
        await stage.locator("[data-state=RESULTS]").waitFor({ timeout: 15000 });
        checks.push({
          name: "Término real via IFrame após seek técnico perto do fim",
          ended: true,
          zeroEligibleResult: true,
        });
      } catch {
        checks.push({ name: "Término real após seek técnico", ended: false });
      }
    }
  }
  await host.getByRole("link", { name: "Gerenciar", exact: true }).click();
  await host.getByRole("button", { name: "Encerrar sala" }).click();
  await host.getByRole("button", { name: "Confirmar", exact: true }).click();
} catch (e) {
  checks.push({
    name: "Execução",
    error: e instanceof Error ? e.name : "UNKNOWN",
    summary:
      "O fluxo real não concluiu; revisar adaptadores e ambiente sem registrar URLs com credenciais.",
  });
} finally {
  const report = {
    at: new Date().toISOString(),
    origin: base,
    checks,
    limitations:
      "Chromium headless. Não substitui aprovação comercial, cota real de produção, autoplay/término/áudio em aparelhos ou piloto físico.",
  };
  writeFileSync("docs/real-spike-result.json", JSON.stringify(report, null, 2));
  console.log(report);
  await browser.close();
}
