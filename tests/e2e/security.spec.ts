import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("CSRF, isolamento, escopo de palco e pareamento de uso único", async ({
  browser,
}) => {
  const host = await browser.newContext(),
    stage = await browser.newContext(),
    stranger = await browser.newContext();
  try {
    const redirect = await host.request.get(
      "http://127.0.0.1:5174/stage/pair?roomCode=12345678",
      {
        headers: { Accept: "text/html" },
        maxRedirects: 0,
      },
    );
    expect(redirect.status()).toBe(302);
    expect(redirect.headers().location).toBe(
      "http://localhost:5174/stage/pair?roomCode=12345678",
    );
    for (const context of [host, stage, stranger]) {
      const csrf = await (await context.request.get("/api/v1/csrf")).json();
      await context.setExtraHTTPHeaders({
        Origin: "http://localhost:5174",
        "x-csrf-token": csrf.token,
      });
    }
    const created = await (
      await host.request.post("/api/v1/rooms", {
        data: { nickname: "Anfitrião" },
      })
    ).json();
    const id = created.roomId;
    expect(
      (await stranger.request.get(`/api/v1/rooms/${id}/snapshot`)).status(),
    ).toBe(401);
    expect(
      (
        await stranger.request.get(`/api/v1/rooms/${id}/music/suggestions`)
      ).status(),
    ).toBe(401);
    const other = await (
      await stranger.request.post("/api/v1/rooms", {
        data: { nickname: "Outra sala" },
      })
    ).json();
    expect(
      (
        await stranger.request.post(`/api/v1/rooms/${id}/commands`, {
          data: { commandId: randomUUID(), kind: "CLOSE", payload: {} },
        })
      ).status(),
    ).toBe(401);
    const command = (kind: string, payload: unknown = {}) =>
      host.request.post(`/api/v1/rooms/${id}/commands`, {
        data: { commandId: randomUUID(), kind, payload },
      });
    const pairing = await (await command("PAIR")).json();
    expect(pairing.code).toHaveLength(24);
    expect(
      (
        await stage.request.post("/api/v1/pairing/redeem", {
          data: { code: pairing.code },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await stage.request.post("/api/v1/pairing/redeem", {
          data: { code: pairing.code },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await stage.request.post(`/api/v1/rooms/${id}/commands?stage=1`, {
          data: { commandId: randomUUID(), kind: "CLOSE", payload: {} },
        })
      ).status(),
    ).toBe(403);
    const second = await (await command("PAIR")).json();
    expect(
      (
        await host.request.post("/api/v1/pairing/redeem", {
          data: { code: second.code },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await stage.request.get(`/api/v1/rooms/${id}/snapshot?stage=1`)
      ).status(),
    ).toBe(401);
    await host.setExtraHTTPHeaders({
      Origin: "https://foreign.invalid",
      "x-csrf-token": "bad",
    });
    expect((await command("CLOSE")).status()).toBe(403);
    const token = await (await host.request.get("/api/v1/csrf")).json();
    await host.setExtraHTTPHeaders({
      Origin: "http://localhost:5174",
      "x-csrf-token": token.token,
    });
    await command("CLOSE");
    await stranger.request.post(`/api/v1/rooms/${other.roomId}/commands`, {
      data: { commandId: randomUUID(), kind: "CLOSE", payload: {} },
    });
  } finally {
    await Promise.allSettled([host.close(), stage.close(), stranger.close()]);
  }
});
