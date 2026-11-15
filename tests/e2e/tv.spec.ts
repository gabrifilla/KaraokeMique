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
    await host.goto("/rooms/new");
    await host.getByLabel("Como a galera te chama?").fill("Anfitrião TV");
    await host.getByRole("button", { name: "Criar minha sala" }).click();
    const roomCode = host.locator("[data-room-code]");
    await expect(roomCode).toHaveText(/^[A-F0-9]{8}$/);
    const roomUrl = host.url();
    // Reutiliza a sala para respeitar o limite real de criação por IP na suíte.
    await checkSuggestions(host);
    await tv.goto("/");
    await tv
      .getByRole("link", { name: "Usar como palco", exact: true })
      .click();
    await expect(tv.locator(".tv-code")).toHaveText(/^\d{6}$/);
    const code = await tv.locator(".tv-code").textContent();
    // Opening the QR destination preserves the host's browser identity.
    await phone.goto(`/connect-tv?code=${code}`);
    await phone
      .getByRole("button", { name: /Conectar à sala/ })
      .filter({ hasText: (await roomCode.textContent())! })
      .click();
    await expect(tv.locator(".qr svg")).toBeVisible();
    await expect(tv.locator(".stage-main")).toBeVisible();
    await phone.getByRole("link", { name: "Palco", exact: true }).click();
    await phone
      .getByText("Conectar ou reconfigurar TV", { exact: true })
      .click();
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
