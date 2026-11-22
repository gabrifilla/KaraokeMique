import { expect, type Page } from "@playwright/test";

/** Percorre o tour curto do anfitrião numa sala recém-criada (TV desligada). */
export async function checkHostTour(host: Page) {
  const base = new URL(host.url()).pathname;
  // Em navegador automatizado o tour não abre sozinho; o botão sempre abre.
  await expect(host.getByRole("dialog")).toHaveCount(0);
  await host.getByRole("button", { name: "Tutorial" }).click();
  await expect(host.getByRole("dialog", { name: /Míque/ })).toBeVisible();
  // O nome da janela acompanha o título de cada passo.
  const tour = host.locator(".tour-card");
  await expect(tour.getByText("Passo 1 de 4")).toBeVisible();
  await expect(tour.locator(".tour-mascot")).toHaveAttribute(
    "src",
    "/mascot/v3/welcome.webp",
  );
  // O primeiro passo apresenta o cartão "o que fazer agora".
  await expect(host.locator(".tour-spotlight")).toBeVisible();
  // Cutucar o Míque faz ele responder.
  await host.getByRole("button", { name: "Cutucar o Míque" }).click();
  await expect(host.locator(".tour-poke")).toBeVisible();

  const next = () => host.getByRole("button", { name: "Próximo" }).click();
  const title = (name: string) =>
    expect(host.getByRole("heading", { name })).toBeVisible();
  await next();
  await title("Bora pra telona! 📺");
  await expect(host).toHaveURL(new RegExp(`${base}/stage$`));
  await host.screenshot({ path: "docs/screenshots/tour-tv.png" });
  await host.getByRole("button", { name: "Voltar" }).click();
  await title("E aí! Eu sou o Míque 🎤");
  await next();
  await next();
  await title("Chama a galera!");
  await next();
  await title("Posso te chamar? 🔔");
  // Servidor de teste sem chaves de push: o tour não promete aviso bloqueado.
  await expect(tour.getByText(/ainda não foram ligados/)).toBeVisible();
  await expect(host.locator(".tour-confetti")).toBeVisible();
  await host.getByRole("button", { name: "Bora cantar!" }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);
  expect(
    await host.evaluate(() => localStorage.getItem("karaoke.tour.v1.host")),
  ).toBe("done");
  // Rever: abre de novo pelo botão e fecha com "Pular".
  await host.getByRole("button", { name: "Tutorial" }).click();
  await expect(host.getByText("Passo 1 de 4")).toBeVisible();
  await host.getByRole("button", { name: "Pular" }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);

  // Dicas na hora certa: a da aba Palco aparece uma vez e some com "Entendi".
  await host.evaluate(() => localStorage.setItem("karaoke.tips", "on"));
  await host.goto(`${base}/stage`);
  const tip = host.locator(".mique-tip");
  await expect(tip).toContainText("Sua mesa de som");
  await tip.getByRole("button", { name: "Entendi" }).click();
  await expect(tip).toHaveCount(0);
  await host.reload();
  await expect(host.locator(".presentation-controls")).toBeVisible();
  await expect(tip).toHaveCount(0);
  await host.evaluate(() => localStorage.removeItem("karaoke.tips"));
  await host.goto(base);
}
