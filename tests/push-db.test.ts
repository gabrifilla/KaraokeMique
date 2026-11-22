import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Chaves de teste (geradas só para esta suíte); o envio real é simulado.
vi.stubEnv(
  "VAPID_PUBLIC_KEY",
  "BOr4ykEEH2klG6NkzB1vDj4nD5b0p3E7Zr3pTqC0P2lJ7Yy2cZyqR3aG9VbC1mGQe9xW8nZ5k2X7vY3pJ0tD4qE",
);
vi.stubEnv("VAPID_PRIVATE_KEY", "dGVzdC1wcml2YXRlLWtleS1ub3QtcmVhbC0wMDAwMDA");
const sendNotification = vi.fn();
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
}));

const { Store } = await import("../apps/api/src/store.js");
const { notifyRoom } = await import("../apps/api/src/push.js");
const { createRoom, apply } = await import("../packages/domain/src/index.js");

const databaseName = `karaoke_test_${randomUUID().replaceAll("-", "")}`;
const baseUrl =
  process.env.DATABASE_URL ||
  "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev";
const url = new URL(baseUrl);
url.pathname = `/${databaseName}`;
const admin = new pg.Pool({ connectionString: baseUrl });
const store = new Store(url.toString());
beforeAll(async () => {
  await admin.query(
    `CREATE DATABASE ${databaseName} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
  );
  await store.init();
});
afterAll(async () => {
  await store.pool.end();
  if (!/^karaoke_test_[a-f0-9]+$/.test(databaseName))
    throw new Error("Nome de teste inválido");
  await admin.query(`DROP DATABASE ${databaseName}`);
  await admin.end();
});

it("envia cada aviso uma vez e apaga inscrição cancelada no aparelho", async () => {
  const now = Date.now();
  const r = createRoom("Festa", "Alice", "🎤", now);
  r.epoch = 1;
  r.stageSeen = now;
  apply(
    r,
    { id: r.hostId, role: "member" },
    { kind: "ADD", commandId: randomUUID(), payload: {} },
    now,
    {
      id: "abcdefghijk",
      title: "Evidências",
      channel: "Canal",
      thumbnail: "",
      duration: 200,
      fetchedAt: now,
    },
  );
  apply(
    r,
    { id: r.hostId, role: "member" },
    { kind: "PREPARE", commandId: randomUUID(), payload: {} },
    now,
  );
  await store.create(r);
  for (const endpoint of [
    "https://push.example/ok",
    "https://push.example/gone",
  ])
    await store.pool.query(
      "INSERT INTO push_subscriptions(endpoint,room_id,person_id,p256dh,auth) VALUES($1,$2,$3,'k','a')",
      [endpoint, r.id, r.hostId],
    );
  sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
    if (sub.endpoint.endsWith("/gone")) throw { statusCode: 410 };
  });

  await notifyRoom(store, r, now);
  expect(sendNotification).toHaveBeenCalledTimes(2);
  const payload = JSON.parse(sendNotification.mock.calls[0][1]);
  expect(payload).toMatchObject({
    title: "🎤 É a sua vez!",
    url: `/r/${r.id}`,
  });
  expect(payload.body).toContain("Evidências");
  const left = await store.pool.query(
    "SELECT endpoint FROM push_subscriptions WHERE room_id=$1",
    [r.id],
  );
  expect(left.rows.map((x) => x.endpoint)).toEqual(["https://push.example/ok"]);

  // Mesmo estado de novo (outra atualização da sala): não repete o aviso.
  await notifyRoom(store, r, now + 1000);
  expect(sendNotification).toHaveBeenCalledTimes(2);
});
