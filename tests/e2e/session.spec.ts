import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { checkHostTour } from "./helpers/tour";
test("anfitrião, dois celulares e palco: fila, voto, bis, reconexão e moderação", async ({
  browser,
}) => {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  for (let i = 0; i < 4; i++) {
    const c = await browser.newContext({
      viewport:
        i === 3 ? { width: 1280, height: 720 } : { width: 390, height: 844 },
    });
    await c.addInitScript(() => {
      (window as any).__scoreOscillators = 0;
      const Original = window.AudioContext;
      window.AudioContext = class extends Original {
        createOscillator() {
          (window as any).__scoreOscillators++;
          return super.createOscillator();
        }
      };
    });
    contexts.push(c);
    pages.push(await c.newPage());
  }
  const [host, b, c, stage] = pages;
  async function qrInViewport() {
    await expect(stage.locator(".qr svg")).toBeInViewport({ ratio: 1 });
    const invite = await stage.locator(".invite").boundingBox();
    const player = stage.locator(".player-frame");
    if (invite && (await player.isVisible())) {
      const video = await player.boundingBox();
      if (video)
        expect(
          invite.x >= video.x + video.width ||
            invite.y >= video.y + video.height ||
            invite.x + invite.width <= video.x ||
            invite.y + invite.height <= video.y,
        ).toBe(true);
    }
  }
  try {
    await host.goto("/rooms/new");
    await expect(host).toHaveTitle("Karaoke Míque · Solta a voz, pede Bis");
    await expect(host.locator(".brand strong")).toHaveText("Karaoke Míque");
    await host.getByLabel("Como a galera te chama?").fill("Alice");
    await host.getByRole("button", { name: "Criar minha sala" }).click();
    await expect(
      host.getByRole("heading", { name: "A festa vai começar" }),
    ).toBeVisible();
    const id = /\/r\/([^/]+)/.exec(host.url())![1];
    const code = await host.locator("[data-room-code]").textContent();
    await expect(host.locator(".stage-shortcut")).toBeVisible();
    await expect(host.locator(".invite, .qr")).toHaveCount(0);
    await checkHostTour(host);
    await host.getByRole("link", { name: "Palco", exact: true }).click();
    await host.getByLabel("Tocar fila automaticamente").click();
    await expect(
      host.getByLabel("Tocar fila automaticamente"),
    ).not.toBeChecked();
    for (const [page, name] of [
      [b, "Bruno"],
      [c, "Carla"],
    ] as const) {
      await page.goto(`/join/${code}`);
      await page.getByLabel("Como a galera te chama?").fill(name);
      await page.getByRole("button", { name: "Entrar na sala" }).click();
      await expect(
        page.getByRole("heading", { name: "A festa vai começar" }),
      ).toBeVisible();
    }
    await host.getByRole("link", { name: "Palco", exact: true }).click();
    await stage.goto("/stage/tv");
    const tvCode = stage.locator(".tv-code");
    await expect(tvCode).toHaveText(/^\d{6}$/);
    await expect(tvCode).toBeInViewport({ ratio: 1 });
    await expect(stage.locator(".tv-qr svg")).toBeInViewport({ ratio: 1 });
    await expect(
      stage.getByRole("link", { name: "Usar um código autorizado" }),
    ).toBeInViewport({ ratio: 1 });
    await stage.screenshot({ path: "docs/screenshots/tv-connect.png" });
    await host
      .getByLabel("Número que aparece na TV")
      .fill((await tvCode.textContent())!);
    await host.getByRole("button", { name: "Ligar a TV", exact: true }).click();
    await qrInViewport();
    await expect(stage.locator(".stage-main")).toBeVisible();
    await expect(
      stage.locator(".stage-tools, .gif-spotlight button"),
    ).toHaveCount(0);
    await stage.locator(".stage-main").click();
    await qrInViewport();
    async function add(page: Page, index: number) {
      await page.getByRole("link", { name: "Buscar", exact: true }).click();
      await page.getByLabel("Música ou artista").fill("right through me");
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      await expect(page.locator(".song")).toHaveCount(3);
      await page
        .locator(".song")
        .nth(index)
        .getByRole("button", { name: "Adicionar" })
        .click();
      await expect(
        page
          .locator(".song")
          .nth(index)
          .getByRole("button", { name: "Na fila ✓" }),
      ).toBeVisible();
    }
    await add(host, 0);
    await add(host, 1);
    await add(b, 0);
    await add(c, 0);
    await c.screenshot({ path: "docs/screenshots/search.png", fullPage: true });
    await host.getByRole("link", { name: "Sala", exact: true }).click();
    await expect(host.locator(".stage-shortcut")).toHaveCount(0);
    await expect(
      host.getByRole("link", { name: "Palco", exact: true }),
    ).toBeVisible();
    await expect(b.locator(".invite, .qr")).toHaveCount(0);
    await expect(host.locator(".queue")).toHaveCount(0);
    await expect(b.locator(".queue")).toHaveCount(0);
    await expect(stage.locator(".queue li")).toHaveCount(4);
    await host.getByRole("link", { name: "Palco", exact: true }).click();
    await host.getByLabel("Tocar fila automaticamente").click();
    await expect(host.getByLabel("Tocar fila automaticamente")).toBeChecked();
    // Readiness starts playback without any click on the stage.
    await expect(stage.locator('[data-state="PLAYING"]')).toBeVisible();
    await qrInViewport();
    await stage.screenshot({ path: "docs/screenshots/stage-preparing.png" });
    await expect(
      stage.getByRole("button", { name: "Tocar no palco" }),
    ).toHaveCount(0);
    await expect(
      host.getByRole("heading", { name: "É hora do show" }),
    ).toBeVisible();
    await expect(stage.locator(".room-header")).toHaveCount(0);
    const playerBounds = await stage.locator(".player-frame").boundingBox();
    const inviteBounds = await stage.locator(".invite").boundingBox();
    const queueBounds = await stage
      .locator(".stage-sidebar .queue")
      .boundingBox();
    expect(playerBounds!.width).toBeGreaterThan(1280 * 0.68);
    expect(playerBounds!.height).toBeGreaterThan(720 * 0.7);
    expect(inviteBounds!.height).toBeLessThan(260);
    expect(queueBounds!.y).toBeGreaterThanOrEqual(
      inviteBounds!.y + inviteBounds!.height,
    );
    await b.getByRole("link", { name: "Sala", exact: true }).click();
    await b.getByRole("button", { name: "Enviar 🔥" }).click();
    await c.getByRole("link", { name: "Sala", exact: true }).click();
    await c.getByRole("button", { name: "Enviar 👏" }).click();
    await b.evaluate(() => window.scrollTo(0, 0));
    await b.screenshot({
      path: "docs/screenshots/player-approved.png",
      fullPage: true,
    });
    await host.screenshot({
      path: "docs/screenshots/host-stage-controls.png",
      fullPage: true,
    });
    await expect(stage.locator(".emoji-drop")).toHaveCount(2);
    await expect(stage.locator(".emoji-overlay")).toContainText("🔥");
    const positions = await stage
      .locator(".emoji-drop")
      .evaluateAll((elements) =>
        elements.map((e) => ({
          left: (e as HTMLElement).style.left,
          top: (e as HTMLElement).style.top,
        })),
      );
    expect(positions[0]).not.toEqual(positions[1]);
    await expect(stage.locator(".emoji-overlay")).toHaveCSS(
      "pointer-events",
      "none",
    );
    await expect
      .poll(() =>
        stage
          .locator(".emoji-drop")
          .first()
          .evaluate((e) => Number(getComputedStyle(e).opacity)),
      )
      .toBeGreaterThan(0.6);
    await stage.screenshot({
      path: "docs/screenshots/stage-emoji-overlay.png",
    });
    await expect(stage.locator(".emoji-drop")).toHaveCount(0, {
      timeout: 6500,
    });
    // Somente o catálogo/mídia do fornecedor é simulado aqui; envio por Socket.IO é real.
    const gif = {
      id: "miqueGif",
      title: "GIF de aplausos do teste",
      rating: "g",
      images: {
        fixed_height_small: { url: "https://mique-test.invalid/reaction.svg" },
        fixed_height: { url: "https://mique-test.invalid/reaction.svg" },
        downsized: { url: "https://mique-test.invalid/reaction.svg?large=1" },
      },
    };
    for (const context of [contexts[1], contexts[3]]) {
      await context.route("https://api.giphy.com/v1/gifs/**", async (route) => {
        const search = new URL(route.request().url()).pathname.endsWith(
          "/search",
        );
        await route.fulfill({
          json: search
            ? { data: [gif], pagination: { total_count: 1 } }
            : { data: gif },
          headers: { "access-control-allow-origin": "*" },
        });
      });
      await context.route("https://mique-test.invalid/reaction.svg*", (route) =>
        route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="#6942c5"/><text x="180" y="320" text-anchor="middle" fill="white" font-size="34">Aplausos!</text></svg>',
        }),
      );
    }
    await expect(b.getByLabel("Encontre sua reação")).toBeVisible();
    await expect(
      b.getByRole("button", { name: "Minimizar GIFs", exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    await b.getByLabel("Encontre sua reação").fill("aplausos");
    await b.getByRole("button", { name: "Buscar GIFs" }).click();
    await b.locator(".gif-grid button").first().click();
    await b.screenshot({
      path: "docs/screenshots/player-gif-controls.png",
      fullPage: true,
    });
    await expect(
      stage.locator(".stage-sidebar .gif-spotlight img"),
    ).toBeVisible();
    await expect(stage.locator(".gif-sender")).toHaveText("Enviado por Bruno");
    await expect(stage.locator(".stage-tools")).toHaveCount(0);
    await expect(stage.locator(".gif-spotlight img")).toHaveAttribute(
      "src",
      /large=1/,
    );
    await host
      .getByRole("button", { name: "Ampliar GIF", exact: true })
      .click();
    await expect(
      stage.getByRole("region", { name: "GIF ampliado" }),
    ).toBeVisible();
    const largeImage = await stage.locator(".gif-focus-media").boundingBox();
    expect(largeImage!.height).toBeGreaterThan(400);
    const qrBounds = await stage.locator(".invite").boundingBox();
    const focusBounds = await stage.locator(".gif-focus").boundingBox();
    expect(focusBounds!.x + focusBounds!.width).toBeLessThan(qrBounds!.x);
    await qrInViewport();
    await stage.screenshot({ path: "docs/screenshots/stage-gif-expanded.png" });
    await host
      .getByRole("button", { name: "Tamanho normal", exact: true })
      .click();
    await expect(stage.locator(".gif-focus")).toHaveCount(0);
    const gifBounds = await stage.locator(".gif-spotlight").boundingBox();
    const nextBounds = await stage
      .locator(".stage-sidebar .queue")
      .boundingBox();
    expect(nextBounds!.y + nextBounds!.height).toBeLessThanOrEqual(
      gifBounds!.y,
    );
    await expect(stage.locator(".gif-spotlight img")).toHaveCSS(
      "object-fit",
      "contain",
    );
    await host
      .getByRole("button", { name: "Minimizar GIF", exact: true })
      .click();
    await expect(stage.locator(".gif-spotlight-media")).toBeHidden();
    await host.reload();
    await expect(
      host.getByRole("button", { name: "Minimizar GIF", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await host
      .getByRole("button", { name: "Tamanho normal", exact: true })
      .click();
    await b
      .getByRole("button", { name: "Minimizar GIFs", exact: true })
      .click();
    await expect(b.getByLabel("Encontre sua reação")).toBeHidden();
    await expect(b.locator(".reactions-card .emoji-row")).toBeVisible();
    await expect(b.locator(".reactions-card .gif-picker")).toHaveCount(0);
    await expect(b.getByRole("button", { name: "Minimizar GIFs" })).toHaveCount(
      0,
    );
    await b.getByRole("button", { name: "Expandir GIFs", exact: true }).click();
    await expect(b.getByLabel("Encontre sua reação")).toHaveValue("aplausos");
    await expect(b.locator(".gifs-card .gif-grid button")).toHaveCount(1);
    await expect(stage.locator(".emoji-overlay img")).toHaveCount(0);
    await qrInViewport();
    await stage.screenshot({ path: "docs/screenshots/stage-gif-sidebar.png" });
    await host.getByLabel("Mostrar reações no palco").click();
    await expect(host.getByLabel("Mostrar reações no palco")).not.toBeChecked();
    await expect(stage.locator(".gif-spotlight img")).toHaveCount(0);
    await host.getByLabel("Mostrar reações no palco").click();
    await expect(host.getByLabel("Mostrar reações no palco")).toBeChecked();
    await host.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(
      host.getByRole("heading", { name: "Uma pausa para respirar" }),
    ).toBeVisible();
    await qrInViewport();
    await host.getByRole("button", { name: "Iniciar / retomar" }).click();
    await expect(
      host.getByRole("heading", { name: "É hora do show" }),
    ).toBeVisible();
    await stage.reload();
    await expect(stage.locator(".stage-main")).toBeVisible();
    await stage.getByRole("button", { name: "Simular término" }).click();
    await expect(
      b.getByRole("heading", { name: "Qual nota essa voz merece?" }),
    ).toBeVisible();
    await b.screenshot({ path: "docs/screenshots/vote.png", fullPage: true });
    await qrInViewport();
    // Um toque vota; tocar em outra nota troca sem contar duas vezes.
    await b.getByRole("button", { name: "Nota 5", exact: true }).click();
    await expect(b.getByText("Sua nota: 5.")).toBeVisible();
    for (const page of [b, c]) {
      await page.getByRole("button", { name: "Nota 10", exact: true }).click();
      await expect(page.getByText("Sua nota: 10.")).toBeVisible();
    }
    await expect(
      stage.locator('.score-result[data-phase="revealing"]'),
    ).toBeVisible();
    const initialScore = await stage.locator(".result-score").innerText();
    expect(Number(initialScore.replace(",", "."))).toBeLessThan(10);
    await expect(host.locator(".result-score")).toHaveText("10,0");
    const resultBox = await host.locator(".score-result").boundingBox();
    for (const selector of [".result-score", ".result-mascot"]) {
      const item = await host.locator(selector).boundingBox();
      expect(item!.x).toBeGreaterThanOrEqual(resultBox!.x);
      expect(item!.x + item!.width).toBeLessThanOrEqual(
        resultBox!.x + resultBox!.width,
      );
    }
    await expect(
      stage.locator(
        '.score-result[data-phase="revealed"][data-mood="celebration"]',
      ),
    ).toBeVisible();
    await expect(stage.locator(".result-intro")).toContainText(
      "Alice cantou Noite de estrelas",
    );
    await expect(stage.locator(".result-mascot")).toHaveAttribute(
      "aria-label",
      /comemorando/,
    );
    await expect
      .poll(() => stage.evaluate(() => (window as any).__scoreOscillators))
      .toBeGreaterThan(0);
    expect(await host.evaluate(() => (window as any).__scoreOscillators)).toBe(
      0,
    );
    expect(await b.evaluate(() => (window as any).__scoreOscillators)).toBe(0);
    await host.getByLabel("Tocar som da revelação da nota").click();
    await expect(
      host.getByLabel("Tocar som da revelação da nota"),
    ).not.toBeChecked();
    await expect
      .poll(
        async () =>
          (
            await (
              await stage.request.get(`/api/v1/rooms/${id}/snapshot?stage=1`)
            ).json()
          ).settings.scoreSound,
      )
      .toBe(false);
    await stage.setViewportSize({ width: 1920, height: 1080 });
    await qrInViewport();
    await expect(stage.locator(".result")).toBeInViewport({ ratio: 1 });
    await expect(stage.locator(".stage-sidebar .queue")).toBeInViewport({
      ratio: 1,
    });
    await stage.screenshot({ path: "docs/screenshots/stage-1080p.png" });
    await stage.setViewportSize({ width: 1280, height: 720 });
    await expect(
      host.getByRole("heading", { name: "Nota 10! Quer cantar mais uma?" }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Quero um bis!" }).click();
    await expect(stage.locator(".queue li").first()).toContainText(
      "Bis por nota 10",
    );
    await contexts[1].setOffline(true);
    await expect(b.locator(".connection-banner")).toContainText("Reconectando");
    await contexts[1].setOffline(false);
    await expect(b.getByText("● Conectado", { exact: true })).toBeVisible();
    await b.reload();
    await expect(b.locator("[data-room-code]")).toHaveText(code!);
    await qrInViewport();
    await stage.screenshot({
      path: "docs/screenshots/stage.png",
      fullPage: true,
    });
    await host.screenshot({
      path: "docs/screenshots/mobile.png",
      fullPage: true,
    });
    await expect(
      host.getByRole("heading", { name: "É hora do show" }),
    ).toBeVisible({ timeout: 10000 });
    await stage.getByRole("button", { name: "Simular falha" }).click();
    await expect(
      host.getByRole("heading", { name: "Vamos recuperar o palco" }),
    ).toBeVisible();
    await qrInViewport();
    await host.getByRole("button", { name: "Cancelar por falha" }).click();
    await host.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      host.getByRole("heading", { name: "A festa vai começar" }),
    ).toBeVisible();
    await host.getByRole("link", { name: "Gerenciar", exact: true }).click();
    const bruno = host.locator(".people li").filter({ hasText: "Bruno" });
    await bruno
      .getByRole("button", { name: "Transferir", exact: true })
      .click();
    await host.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Autorizar palco" }),
    ).toHaveCount(0);
    await b.getByRole("link", { name: "Gerenciar", exact: true }).click();
    await b.getByRole("button", { name: "Encerrar sala" }).click();
    await b.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      b.getByRole("heading", { name: "Foi bom demais!" }),
    ).toBeVisible();
    // Festa encerrada: a TV agradece e esconde o QR da sala fechada.
    await expect(stage.locator(".stage-closed")).toBeVisible();
    await expect(stage.locator(".invite")).toHaveCount(0);
  } finally {
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});
