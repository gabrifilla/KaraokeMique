import { expect, type Page } from "@playwright/test";

/** Percorre o tour guiado do anfitrião numa sala recém-criada. */
export async function checkHostTour(host: Page) {
  const base = new URL(host.url()).pathname;
  // Em navegador automatizado o tour não abre sozinho; o botão sempre abre.
  await expect(host.getByRole("dialog")).toHaveCount(0);
  await host.getByRole("button", { name: "Tutorial" }).click();
  const tour = host.getByRole("dialog", { name: /Míque/ });
  await expect(tour).toBeVisible();
  await expect(tour.getByText("Passo 1 de 9")).toBeVisible();
  await expect(tour.locator(".tour-mascot")).toHaveAttribute(
    "src",
    "/mascot/v3/welcome.webp",
  );
  const next = () => host.getByRole("button", { name: "Próximo" }).click();
  await next();
  await expect(
    host.getByRole("heading", { name: "O código da sua sala" }),
  ).toBeVisible();
  await expect(host.locator(".tour-spotlight")).toBeVisible();
  await next();
  await expect(
    host.getByRole("heading", { name: "Coloque a festa na TV" }),
  ).toBeVisible();
  await expect(host).toHaveURL(new RegExp(`${base}/stage$`));
  await host.screenshot({ path: "docs/screenshots/tour-tv.png" });
  await host.getByRole("button", { name: "Voltar" }).click();
  await expect(
    host.getByRole("heading", { name: "O código da sua sala" }),
  ).toBeVisible();
  for (let i = 0; i < 7; i++) await next();
  await expect(
    host.getByRole("heading", { name: "Agora é com você!" }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Bora cantar!" }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);
  expect(
    await host.evaluate(() => localStorage.getItem("karaoke.tour.v1.host")),
  ).toBe("done");
  // Rever: abre de novo pelo botão e fecha com "Pular".
  await host.getByRole("button", { name: "Tutorial" }).click();
  await expect(host.getByText("Passo 1 de 9")).toBeVisible();
  await host.getByRole("button", { name: "Pular" }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);
  await host.goto(base);
}
