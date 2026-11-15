import { beforeAll, afterAll, it, expect } from "vitest";
import { Store, hash } from "../apps/api/src/store.js";
import { createRoom, apply, maintain } from "../packages/domain/src/index.js";
import type { Actor } from "../packages/contracts/src/index.js";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { resolvePairing } from "../apps/api/src/pairing.js";
import { prepareAutomatically } from "../apps/api/src/auto-queue.js";
import {
  createTvPairing,
  approveTvPairing,
  redeemTvPairing,
} from "../apps/api/src/tv-pairing.js";
const databaseName = `karaoke_test_${randomUUID().replaceAll("-", "")}`;
const baseUrl =
  process.env.DATABASE_URL ||
  "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev";
const connectionUrl = new URL(baseUrl);
connectionUrl.pathname = `/${databaseName}`;
const testUrl = connectionUrl.toString();
const admin = new pg.Pool({ connectionString: baseUrl });
const store = new Store(testUrl);
const created: string[] = [];
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
async function setup() {
  const r = createRoom("Teste", "Host", "🎤", Date.now());
  const token = await store.create(r);
  created.push(r.id);
  return { r, token };
}
it("avanço automático concorrente prepara uma vez e preserva a fila na falha do fornecedor", async () => {
  const { r } = await setup();
  const video = {
    id: "abcdefghijk",
    title: "Teste",
    channel: "Canal",
    thumbnail: "",
    duration: 100,
    fetchedAt: Date.now(),
  };
  await store.mutate(r.id, (room) => {
    room.stageSeen = Date.now();
    room.epoch = 1;
    apply(
      room,
      { id: room.hostId, role: "member" },
      { kind: "ADD", commandId: randomUUID(), payload: {} },
      Date.now(),
      video,
    );
  });
  await Promise.all(
    Array.from({ length: 4 }, () =>
      prepareAutomatically(store, r.id, async () => video),
    ),
  );
  const prepared = await store.read(r.id);
  expect(prepared.state).toBe("PREPARING");
  expect(prepared.history).toHaveLength(0);
  expect(prepared.people[0].turns).toBe(0);
  await store.mutate(r.id, (room) => {
    room.state = "LOBBY";
    room.current = undefined;
    room.songs[0].status = "WAITING";
  });
  await prepareAutomatically(store, r.id, async () => {
    throw new Error("quota");
  });
  const failed = await store.read(r.id);
  expect(failed.settings.autoPlay).toBe(false);
  expect(failed.songs[0].status).toBe("WAITING");
  expect(failed.autoPlayError).toContain("preservada");
});
it("TV exige autorização do anfitrião e posse do segredo do dispositivo; substitui o palco anterior", async () => {
  const { r } = await setup();
  const tv = await createTvPairing(store);
  expect(tv.code).toMatch(/^\d{6}$/);
  expect(await redeemTvPairing(store, tv.id, tv.deviceToken)).toEqual({
    state: "WAITING",
  });
  await expect(redeemTvPairing(store, tv.id, "wrong-device")).rejects.toThrow(
    "expirou",
  );
  await expect(
    approveTvPairing(store, r.id, { id: "stranger", role: "member" }, tv.code),
  ).rejects.toThrow();
  await approveTvPairing(
    store,
    r.id,
    { id: r.hostId, role: "member" },
    tv.code,
  );
  const paired = await redeemTvPairing(store, tv.id, tv.deviceToken);
  expect(paired.state).toBe("PAIRED");
  if (paired.state !== "PAIRED" || !paired.token)
    throw new Error("TV não recebeu sessão");
  expect((await store.session(paired.token, r.id)).role).toBe("stage");
  const epoch = (await store.read(r.id)).epoch;
  await redeemTvPairing(store, tv.id, tv.deviceToken);
  expect((await store.read(r.id)).epoch).toBe(epoch);
  const replacement = await createTvPairing(store);
  await approveTvPairing(
    store,
    r.id,
    { id: r.hostId, role: "member" },
    replacement.code,
  );
  await redeemTvPairing(store, replacement.id, replacement.deviceToken);
  await expect(store.session(paired.token, r.id)).rejects.toThrow();
  const expired = await createTvPairing(store);
  await store.pool.query(
    "UPDATE tv_pairings SET expires_at=now()-interval '1 second' WHERE id=$1",
    [expired.id],
  );
  await expect(
    approveTvPairing(
      store,
      r.id,
      { id: r.hostId, role: "member" },
      expired.code,
    ),
  ).rejects.toThrow("expirado");
});
it("pareamento dev aceita código livre somente para a sala explicitamente informada", async () => {
  const { r } = await setup();
  await setup(); // More than one room must never make the destination ambiguous.
  await expect(
    resolvePairing(
      store.pool,
      { code: "qualquer coisa", roomCode: r.code.toLowerCase() },
      "development",
    ),
  ).resolves.toEqual({ roomId: r.id, codeHash: undefined });
  await expect(
    resolvePairing(store.pool, { code: " ", roomCode: r.code }, "development"),
  ).rejects.toThrow();
  await expect(
    resolvePairing(
      store.pool,
      { code: "teste", roomCode: "ZZZZZZZZ" },
      "development",
    ),
  ).rejects.toThrow();
});
it("produção, teste e ambiente ausente nunca aceitam o atalho de desenvolvimento", async () => {
  const { r } = await setup();
  for (const environment of ["production", "test", undefined]) {
    await expect(
      resolvePairing(
        store.pool,
        { code: "teste", roomCode: r.code },
        environment,
      ),
    ).rejects.toThrow();
    await expect(
      resolvePairing(
        store.pool,
        { code: "X".repeat(24), roomCode: r.code },
        environment,
      ),
    ).rejects.toThrow("Código de palco inválido");
  }
});
it("sem sala explícita, desenvolvimento também exige um código de pareamento existente", async () => {
  await expect(
    resolvePairing(store.pool, { code: "qualquer" }, "development"),
  ).rejects.toThrow();
  await expect(
    resolvePairing(store.pool, { code: "X".repeat(24) }, "development"),
  ).rejects.toThrow("Código de palco inválido");
});
it("PostgreSQL real serializa comandos concorrentes e recupera recibo/outbox", async () => {
  const { r, token } = await setup();
  const commandId = randomUUID();
  let executed = 0;
  const change = () =>
    store.mutate(
      r.id,
      (room) => {
        executed++;
        room.nextSeq++;
        return { ok: true };
      },
      { token, id: commandId, body: "same" },
    );
  const responses = await Promise.all(Array.from({ length: 12 }, change));
  expect(responses.every((r) => r.ok)).toBe(true);
  expect(executed).toBe(1);
  expect((await store.read(r.id)).nextSeq).toBe(2);
  await expect(
    store.mutate(r.id, () => ({}), { token, id: commandId, body: "different" }),
  ).rejects.toThrow("conteúdo diferente");
  const events = await store.pool.query(
    "SELECT * FROM outbox WHERE room_id=$1 AND published_at IS NULL",
    [r.id],
  );
  expect(events.rowCount).toBe(1);
  const second = new Store(testUrl);
  expect((await second.read(r.id)).nextSeq).toBe(2);
  await second.pool.end();
});
it("duas preparações não criam apresentações concorrentes", async () => {
  const { r } = await setup();
  await store.mutate(r.id, (room) => {
    room.epoch = 1;
    room.stageSeen = Date.now();
    room.songs.push({
      id: randomUUID(),
      personId: room.hostId,
      video: {
        id: "abcdefghijk",
        title: "Canção",
        channel: "Canal",
        thumbnail: "",
        duration: 10,
        fetchedAt: Date.now(),
      },
      seq: 1,
      status: "WAITING",
    });
    return {};
  });
  const attempt = () =>
    store.mutate(r.id, (room) => {
      apply(
        room,
        { id: r.hostId, role: "member" },
        { commandId: randomUUID(), kind: "PREPARE", payload: {} },
        Date.now(),
      );
      return {};
    });
  const result = await Promise.allSettled([attempt(), attempt()]);
  expect(result.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(
    (await store.read(r.id)).songs.filter((s) => s.status === "RESERVED"),
  ).toHaveLength(1);
});
it("votos concorrentes únicos e reinício preserva prazo original", async () => {
  const { r } = await setup();
  const ids = [randomUUID(), randomUUID()];
  const deadline = Date.now() + 1000;
  await store.mutate(r.id, (room) => {
    room.people.push(
      ...ids.map((id) => ({
        id,
        name: "Votante",
        avatar: "🌟",
        status: "ACTIVE" as const,
        turns: 0,
        lastSeen: Date.now(),
      })),
    );
    room.songs.push({
      id: "song",
      personId: room.hostId,
      seq: 1,
      status: "PLAYING",
      video: {
        id: "abcdefghijk",
        title: "Canção",
        channel: "Canal",
        thumbnail: "",
        duration: 10,
        fetchedAt: Date.now(),
      },
    });
    room.state = "VOTING";
    room.current = {
      id: randomUUID(),
      songId: "song",
      singerId: room.hostId,
      epoch: 1,
      lastReport: 2,
      turnApplied: true,
      turnReverted: false,
      isEncore: false,
      round: { eligible: ids, votes: {}, openedAt: deadline - 10000, deadline },
    };
    return {};
  });
  const actor: Actor = { id: ids[0], role: "member" };
  const attempt = () =>
    store.mutate(r.id, (room) => {
      apply(
        room,
        actor,
        { commandId: randomUUID(), kind: "VOTE", payload: { score: 10 } },
        Date.now(),
      );
      return {};
    });
  const results = await Promise.allSettled([attempt(), attempt()]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const restarted = new Store(testUrl);
  await restarted.mutate(r.id, (room) => {
    maintain(room, deadline);
    return {};
  });
  const restored = await restarted.read(r.id);
  expect(restored.current!.round!.deadline).toBe(deadline);
  expect(restored.current!.round!.count).toBe(1);
  expect(restored.current!.round!.average).toBe(10);
  await restarted.pool.end();
});
it("sessão de outra sala não passa e rollback não publica", async () => {
  const a = await setup(),
    b = await setup();
  await expect(store.session(a.token, b.r.id)).rejects.toThrow("expirada");
  const before = (await store.read(a.r.id)).version;
  await expect(
    store.mutate(a.r.id, (room) => {
      room.hostId = "bad";
      throw new Error("failure");
    }),
  ).rejects.toThrow("failure");
  expect((await store.read(a.r.id)).version).toBe(before);
  expect((await store.read(a.r.id)).hostId).toBe(a.r.hostId);
});
