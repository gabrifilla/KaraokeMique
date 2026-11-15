import { expect, type Page } from "@playwright/test";
export async function checkSuggestions(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ideias para soltar a voz" }),
  ).toBeVisible();
  await expect(page.locator(".song")).toHaveCount(3);
  await expect(page.getByLabel("Música ou artista")).toHaveValue("");
  const initialTheme = await page
    .locator("[data-suggestion-theme]")
    .textContent();
  await page
    .getByRole("button", { name: "Outras ideias", exact: true })
    .click();
  await expect(page.locator("[data-suggestion-theme]")).not.toHaveText(
    initialTheme!,
  );
  const secondTheme = await page
    .locator("[data-suggestion-theme]")
    .textContent();
  await page.getByRole("link", { name: "Sala", exact: true }).click();
  await page.getByRole("link", { name: "Buscar", exact: true }).click();
  await expect(page.locator("[data-suggestion-theme]")).not.toHaveText(
    secondTheme!,
  );
  await page
    .locator(".song")
    .first()
    .getByRole("button", { name: "Adicionar", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.locator(".song").first()).toContainText(
    "Essa música já apareceu na sala.",
  );
  await page.screenshot({
    path: "docs/screenshots/search-suggestions.png",
    fullPage: true,
  });
  await page.getByLabel("Música ou artista").fill("minha música");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Resultados para “minha música”" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver sugestões", exact: true })
    .click();
  await expect(page.getByLabel("Música ou artista")).toHaveValue("");
  await expect(page.locator(".song")).toHaveCount(3);
  await page.route("**/music/suggestions", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "YouTube indisponível" } },
    }),
  );
  await page.reload();
  await expect(
    page.getByText("As sugestões estão indisponíveis agora.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Música ou artista").fill("outra música");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Resultados para “outra música”" }),
  ).toBeVisible();
  await expect(page.locator(".song")).toHaveCount(3);
}
