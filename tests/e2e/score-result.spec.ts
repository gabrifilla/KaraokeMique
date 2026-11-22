import { test, expect } from "@playwright/test";

test("resultado sem votos usa mascote confuso; movimento reduzido revela direto", async ({
  browser,
}) => {
  const hostContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const stageContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  try {
    const host = await hostContext.newPage(),
      stage = await stageContext.newPage();
    await host.goto("/rooms/new");
    await host.getByLabel("Como a galera te chama?").fill("Solo");
    await host.getByRole("button", { name: "Criar minha sala" }).click();
    await expect(host.locator("[data-room-code]")).toHaveText(/^[A-F0-9]{8}$/);
    const code = await host.locator("[data-room-code]").textContent();
    const roomUrl = host.url();
    await stage.goto(`/stage/pair?roomCode=${code}`);
    await expect(
      stage.getByLabel("Código da sala (desenvolvimento)"),
    ).toHaveValue(code!);
    await stage.getByLabel("Código autorizado pelo anfitrião").fill("teste");
    await stage.getByRole("button", { name: "Conectar esta tela" }).click();
    await expect(stage.locator(".qr svg")).toBeVisible();
    await host.getByRole("link", { name: "Buscar", exact: true }).click();
    await host.getByLabel("Música ou artista").fill("solo");
    await host.getByRole("button", { name: "Buscar", exact: true }).click();
    await host
      .locator(".song")
      .first()
      .getByRole("button", { name: "Adicionar", exact: true })
      .click();
    await expect(host.getByText("entrou na fila!")).toBeVisible();
    await host.goto(roomUrl);
    await expect(stage.locator('[data-state="PLAYING"]')).toBeVisible();
    await stage
      .getByRole("button", { name: "Simular término", exact: true })
      .click();
    await expect(
      host.locator('.score-result[data-phase="revealed"]'),
    ).toBeVisible();
    await expect(host.locator(".result-score")).toHaveText("Sem notas");
    await expect(
      stage.locator('.score-result[data-mood="confused"]'),
    ).toBeVisible();
    await expect(stage.locator(".result-intro")).toContainText("Solo cantou");
    await expect(stage.locator(".result-mascot")).toHaveAttribute(
      "aria-label",
      /confuso/,
    );
    await expect(stage.locator(".result-phrase")).not.toBeEmpty();
    await expect(stage.locator(".result")).not.toContainText("0 votos");
    await stage.screenshot({ path: "docs/screenshots/result-no-votes.png" });
    await host.screenshot({
      path: "docs/screenshots/result-mobile-no-votes.png",
      fullPage: true,
    });
    await stage.reload();
    await expect(
      stage.locator('.score-result[data-phase="revealed"]'),
    ).toBeVisible();
    await host.getByRole("link", { name: "Gerenciar", exact: true }).click();
    await host
      .getByRole("button", { name: "Encerrar sala", exact: true })
      .click();
    await host.getByRole("button", { name: "Confirmar", exact: true }).click();
  } finally {
    await Promise.allSettled([hostContext.close(), stageContext.close()]);
  }
});
