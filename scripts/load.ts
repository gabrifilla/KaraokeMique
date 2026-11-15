import { Store, hash, secret } from "../apps/api/src/store.js";
import { createRoom } from "../packages/domain/src/index.js";
import { randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { writeFileSync } from "node:fs";
const store = new Store();
await store.init();
const ids: string[] = [];
const sockets: Socket[] = [];
const latencies: number[] = [];
let failures = 0;
try {
  for (let n = 0; n < 20; n++) {
    const room = createRoom("Carga local", "Host", "🎤", Date.now());
    await store.create(room);
    ids.push(room.id);
    const sessions: { token: string; stage: boolean }[] = [];
    await store.mutate(room.id, async (r, c) => {
      r.epoch = 1;
      r.stageSeen = Date.now();
      for (let i = 0; i < 31; i++) {
        const token = secret();
        const stage = i === 30;
        const id = i === 0 ? r.hostId : randomUUID();
        if (i > 0 && !stage)
          r.people.push({
            id,
            name: "Carga",
            avatar: "🎤",
            status: "ACTIVE",
            turns: 0,
            lastSeen: Date.now(),
          });
        await c.query(
          "INSERT INTO sessions(token_hash,room_id,actor) VALUES($1,$2,$3)",
          [
            hash(token),
            r.id,
            {
              id,
              role: stage ? "stage" : "member",
              ...(stage ? { epoch: 1 } : {}),
            },
          ],
        );
        sessions.push({ token, stage });
      }
      return {};
    });
    await Promise.all(
      sessions.map(
        ({ token, stage }) =>
          new Promise<void>((resolve) => {
            const started = performance.now();
            const s = io("http://localhost:3001", {
              auth: { roomId: room.id, stage },
              transports: ["websocket"],
              extraHeaders: {
                Origin: "http://localhost:5173",
                Cookie: `k_${stage ? "stage" : "member"}_${room.id}=${token}`,
              },
              reconnection: false,
            });
            sockets.push(s);
            const timer = setTimeout(() => {
              failures++;
              resolve();
            }, 15000);
            s.once("room.state", () => {
              clearTimeout(timer);
              latencies.push(performance.now() - started);
              resolve();
            });
            s.once("connect_error", () => {
              clearTimeout(timer);
              failures++;
              resolve();
            });
          }),
      ),
    );
  }
  const heartbeatStart = performance.now();
  const heartbeats = await Promise.all(
    sockets.map(
      (s) =>
        new Promise<boolean>((resolve) =>
          s
            .timeout(15000)
            .emit("presence.heartbeat", (error: any, r: any) =>
              resolve(!error && r?.ok === true),
            ),
        ),
    ),
  );
  latencies.sort((a, b) => a - b);
  const report = {
    at: new Date().toISOString(),
    scenario:
      "20 salas × (30 participantes + 1 palco), PostgreSQL real e Socket.IO local",
    connections: sockets.length,
    firstSnapshots: latencies.length,
    failures,
    initialSnapshotP95Ms: Math.round(
      latencies[Math.floor(latencies.length * 0.95)] || 0,
    ),
    heartbeatAcknowledged: heartbeats.filter(Boolean).length,
    heartbeatBatchMs: Math.round(performance.now() - heartbeatStart),
    limits:
      "Ensaio curto, sem buscas externas, áudio, vídeo, votos ou carga sustentada. Não é comprovação de SLA.",
  };
  writeFileSync("docs/load-result.json", JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  for (const s of sockets) s.disconnect();
  for (const id of ids)
    await store.pool.query("DELETE FROM rooms WHERE id=$1", [id]);
  await store.pool.end();
}
