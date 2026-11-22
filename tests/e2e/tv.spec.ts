import { test, expect } from "@playwright/test";
import { checkSuggestions } from "./helpers/suggestions";

test("TV autorizada pelo QR no celular e abertura direta com um toque", async ({
  browser,
}) => {
  const hostContext = await browser.newContext(),
    tvContext = await browser.newContext();
  try {
    const host = await hostContext.newPage(),
      phone = await hostContext.newPage(),
      tv = await tvContext.newPage();
    // Fluxo novo: a TV mostra o QR, o celular cria a sala e a TV liga sozinha.
    await tv.goto("/");
    await tv
      .getByRole("link", { name: "Usar como palco", exact: true })
      .click();
    await expect(tv.locator(".tv-code")).toHaveText(/^\d{6}$/);
    const code = await tv.locator(".tv-code").textContent();
    await host.goto(`/connect-tv?code=${code}`);
    await expect(host).toHaveURL(/\/rooms\/new\?tv=/);
    await host.getByLabel("Como a galera te chama?").fill("Anfitrião TV");
    await host.getByRole("button", { name: "Criar minha sala" }).click();
    await expect(host.getByText("TV ligada!")).toBeVisible();
    await expect(tv.locator(".stage-main")).toBeVisible();
    await expect(tv.locator(".qr svg")).toBeVisible();
    const roomCode = host.locator("[data-room-code]");
    await expect(roomCode).toHaveText(/^[A-F0-9]{8}$/);
    const roomUrl = host.url();
    // Fechou a aba? A tela inicial leva de volta pra festa com um toque.
    await host.goto("/");
    await host.getByRole("link", { name: /Voltar pra festa/ }).click();
    await expect(host).toHaveURL(roomUrl);
    // Reutiliza a sala para respeitar o limite real de criação por IP na suíte.
    await checkSuggestions(host);
    // Com sala aberta, o QR de outra TV oferece escolher a festa.
    const tv2 = await tvContext.newPage();
    await tv2.goto("/stage/tv");
    await expect(tv2.locator(".tv-code")).toHaveText(/^\d{6}$/);
    const code2 = await tv2.locator(".tv-code").textContent();
    await phone.goto(`/connect-tv?code=${code2}`);
    await phone.getByRole("button", { name: /Mostrar .* na TV/ }).click();
    await expect(tv2.locator(".stage-main")).toBeVisible();
    await phone.getByRole("link", { name: "Palco", exact: true }).click();
    await phone.locator("summary", { hasText: "Ligar a TV" }).click();
    await phone
      .getByRole("button", { name: "Usar esta tela como palco", exact: true })
      .click();
    await expect(phone.locator(".stage-shell .qr svg")).toBeVisible();
    await expect(tv.locator(".connection-banner")).toBeVisible();
    await host.goto(roomUrl);
    await host.getByRole("link", { name: "Gerenciar", exact: true }).click();
    await host
      .getByRole("button", { name: "Encerrar sala", exact: true })
      .click();
    await host.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(phone.locator('[data-state="CLOSED"]')).toBeVisible();
  } finally {
    await Promise.allSettled([hostContext.close(), tvContext.close()]);
  }
});
