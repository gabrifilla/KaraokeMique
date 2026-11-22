import { expect, type Page } from "@playwright/test";

/** Percorre o tour guiado do anfitrião numa sala recém-criada (TV desligada). */
export async function checkHostTour(host: Page) {
  const base = new URL(host.url()).pathname;
  // Em navegador automatizado o tour não abre sozinho; o botão sempre abre.
  await expect(host.getByRole("dialog")).toHaveCount(0);
  await host.getByRole("button", { name: "Tutorial" }).click();
  await expect(host.getByRole("dialog", { name: /Míque/ })).toBeVisible();
  // O nome da janela acompanha o título de cada passo.
  const tour = host.locator(".tour-card");
  await expect(tour.getByText("Passo 1 de 11")).toBeVisible();
  await expect(tour.locator(".tour-mascot")).toHaveAttribute(
    "src",
    "/mascot/v3/welcome.webp",
  );
  // Cutucar o Míque faz ele responder.
  await host.getByRole("button", { name: "Cutucar o Míque" }).click();
  await expect(tour.locator(".tour-poke")).toBeVisible();

  const next = () => host.getByRole("button", { name: "Próximo" }).click();
  const title = (name: string) =>
    expect(host.getByRole("heading", { name })).toBeVisible();
  await next();
  await title("Bora pra telona! 📺");
  await expect(host).toHaveURL(new RegExp(`${base}/stage$`));
  await expect(host.locator(".tour-spotlight")).toBeVisible();
  await host.screenshot({ path: "docs/screenshots/tour-tv.png" });
  await host.getByRole("button", { name: "Voltar" }).click();
  await title("E aí! Eu sou o Míque 🎤");
  await next();
  await next();
  await title("Chama a galera!");
  await next();
  await title("Este é o meu cantinho");
  await next();
  await title("Escolha sua música");
  await next();
  await title("Sua mesa de som 🎛️");
  await next();
  await title("Posso te chamar? 🔔");
  // Servidor de teste sem chaves de push: o tour não promete aviso bloqueado.
  await expect(tour.getByText(/ainda não foram ligados/)).toBeVisible();
  await next();
  await title("Manda energia pro palco!");
  // Passo "experimente": o emoji destacado funciona de verdade.
  await host.getByRole("button", { name: "Enviar 👏" }).click();
  await expect(tour.getByText(/Uhuul!/)).toBeVisible();
  await next();
  await title("Hora da nota ⭐");
  await next();
  await title("Letra pequena? Sem problema!");
  await host.getByRole("button", { name: "Letras grandes" }).click();
  await expect(tour.getByText(/Olha que letrão!/)).toBeVisible();
  await expect(host.locator("html")).toHaveAttribute("data-text-size", "large");
  await host.getByRole("button", { name: "Letras grandes" }).click();
  await expect(host.locator("html")).not.toHaveAttribute(
    "data-text-size",
    "large",
  );
  await next();
  await title("Arrasou! Agora é com você 🎉");
  await expect(host.locator(".tour-confetti")).toBeVisible();
  await host.getByRole("button", { name: "Bora cantar!" }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);
  expect(
    await host.evaluate(() => localStorage.getItem("karaoke.tour.v1.host")),
  ).toBe("done");
  // Rever: abre de novo pelo botão e fecha com "Pular".
  await host.getByRole("button", { name: "Tutorial" }).click();
  await expect(host.getByText("Passo 1 de 11")).toBeVisible();
  await host.getByRole("button", { name: "Pular" }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);
  await host.goto(base);
}
