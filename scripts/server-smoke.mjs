import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { io } from "socket.io-client";

const name = `karaoke_build_${randomUUID().replaceAll("-", "")}`;
const database = new URL(
  process.env.DATABASE_URL ||
    "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev",
);
const admin = new pg.Pool({ connectionString: database.toString() });
const port = Number(process.env.SMOKE_PORT || 5182),
  origin = `http://localhost:${port}`;
let child, socket;
try {
  await admin.query(
    `CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
  );
  database.pathname = `/${name}`;
  child = spawn(process.execPath, ["dist/server/apps/api/src/main.js"], {
    env: {
      ...process.env,
      DATABASE_URL: database.toString(),
      NODE_ENV: "production",
      INTEGRATION_MODE: "real",
      ALLOW_HTTP_LAN: "true",
      SERVE_WEB: "true",
      WEB_ORIGIN: origin,
      PORT: String(port),
      YOUTUBE_API_KEY: "",
    },
    stdio: "ignore",
  });
  let healthy = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null)
      throw Error("Backend compilado encerrou antes de ficar saudável.");
    try {
      const r = await fetch(`${origin}/api/v1/health`);
      const health = await r.json();
      if (r.ok) {
        assert.equal(health.mode, "real");
        assert.equal(health.developmentPairing, false);
        healthy = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  assert.ok(healthy, "Servidor compilado deve ficar saudável");
  const home = await fetch(origin),
    html = await home.text();
  assert.equal(home.status, 200);
  assert.match(html, /Karaoke Míque/);
  assert.ok(!html.includes("/@vite/client"));
  assert.equal(
    home.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  const js = html.match(/src="([^"]+\.js)"/)[1];
  assert.equal((await fetch(`${origin}${js}`)).status, 200);
  assert.equal((await fetch(`${origin}/fonts/barlow-1.ttf`)).status, 200);
  for (const path of [
    "/assets/does-not-exist.js",
    "/.env",
    "/api/v1/does-not-exist",
  ])
    assert.equal((await fetch(`${origin}${path}`)).status, 404);
  const alias = await fetch(`http://127.0.0.1:${port}/stage/tv`, {
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  assert.equal(alias.status, 302);
  assert.equal(alias.headers.get("location"), `${origin}/stage/tv`);
  const csrfResponse = await fetch(`${origin}/api/v1/csrf`),
    csrf = await csrfResponse.json();
  let cookies = csrfResponse.headers.getSetCookie().map((s) => s.split(";")[0]);
  const headers = () => ({
    Origin: origin,
    "x-csrf-token": csrf.token,
    "Content-Type": "application/json",
    Cookie: cookies.join("; "),
  });
  async function post(path, body) {
    const r = await fetch(`${origin}/api/v1${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    cookies.push(...r.headers.getSetCookie().map((s) => s.split(";")[0]));
    return r;
  }
  const created = await post("/rooms", { nickname: "Build smoke" });
  assert.equal(created.status, 201);
  const room = await created.json();
  assert.equal((await fetch(`${origin}/r/${room.roomId}/search`)).status, 200);
  assert.equal(
    (await post("/pairing/redeem", { code: "teste", roomCode: room.code }))
      .status,
    400,
  );
  const pair = await post(`/rooms/${room.roomId}/commands`, {
    kind: "PAIR",
    commandId: randomUUID(),
    payload: {},
  });
  assert.equal(pair.status, 201);
  assert.equal((await pair.json()).code.length, 24);
  socket = io(origin, {
    auth: { roomId: room.roomId, stage: false },
    transports: ["websocket"],
    extraHeaders: { Origin: origin, Cookie: cookies.join("; ") },
    autoConnect: false,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Snapshot por Socket.IO não recebido")),
      10000,
    );
    socket.once("room.state", (state) => {
      clearTimeout(timer);
      assert.equal(state.id, room.roomId);
      resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.connect();
  });
  const result = {
    compiledServer: true,
    production: true,
    realMode: true,
    frontendAndApiSamePort: true,
    spaFallback: true,
    staticAssets: true,
    referrerPolicy: true,
    strictPairing: true,
    websocketSnapshot: true,
    databaseIsolated: true,
    dockerExecuted: false,
  };
  writeFileSync(
    "docs/server-build-check.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  socket?.close();
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      once(child, "exit"),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  }
  if (!/^karaoke_build_[a-f0-9]{32}$/.test(name))
    throw Error("Banco de teste inválido");
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.end();
}
