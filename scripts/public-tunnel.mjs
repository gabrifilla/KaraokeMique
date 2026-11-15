import "dotenv/config";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

// One compiled production instance, with its own database; never share the dev worker.
const port = Number(process.env.PUBLIC_PORT || 5180);
const binary = resolve(
  process.env.CLOUDFLARED_PATH || ".data/tools/cloudflared.exe",
);
const stateFile = resolve(".data/public-tunnel.json");
if (!existsSync(binary))
  throw Error(
    "Instale cloudflared em .data/tools/cloudflared.exe ou defina CLOUDFLARED_PATH.",
  );
if (!existsSync("dist/server/apps/api/src/main.js"))
  throw Error("Execute pnpm build primeiro.");
// Fail before starting a second worker or publishing another tunnel.
await new Promise((done, fail) => {
  const probe = createConnection({ port, host: "127.0.0.1" });
  probe.once("connect", () => {
    probe.destroy();
    fail(
      new Error(
        `Porta ${port} ocupada. Encerre a instância pública antes de reiniciar.`,
      ),
    );
  });
  probe.once("error", (error) => {
    if (error.code === "ECONNREFUSED") done();
    else fail(error);
  });
});
mkdirSync(".data", { recursive: true });
const database = new URL(
  process.env.DATABASE_URL ||
    "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev",
);
database.pathname = "/karaoke_public";
const adminDatabase = new URL(database);
adminDatabase.pathname = "/postgres";
const admin = new pg.Client({ connectionString: adminDatabase.toString() });
await admin.connect();
try {
  if (
    !(
      await admin.query(
        "SELECT 1 FROM pg_database WHERE datname='karaoke_public'",
      )
    ).rowCount
  ) {
    await admin.query(
      "CREATE DATABASE karaoke_public ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'",
    );
  }
} finally {
  await admin.end();
}

let app,
  tunnel,
  stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  app?.kill();
  tunnel?.kill();
  writeFileSync(
    stateFile,
    JSON.stringify(
      { status: "stopped", stoppedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
const tunnelLog = createWriteStream(".data/public-cloudflared.log", {
  flags: "w",
});
try {
  tunnel = spawn(
    binary,
    ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  for (const stream of [tunnel.stdout, tunnel.stderr])
    stream.on("data", (chunk) => {
      tunnelLog.write(chunk);
      output = (output + chunk.toString()).slice(-32000);
    });
  tunnel.on("error", () => stop(1));
  tunnel.on("exit", () => {
    if (!stopping) stop(1);
  });
  let origin;
  for (let attempt = 0; attempt < 120; attempt++) {
    origin = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
    if (origin) break;
    await delay(500);
  }
  if (!origin)
    throw Error(
      "Não foi possível obter o endereço do túnel. Veja .data/public-cloudflared.log.",
    );
  const appLog = createWriteStream(".data/public-api.log", { flags: "w" });
  app = spawn(process.execPath, ["dist/server/apps/api/src/main.js"], {
    windowsHide: true,
    env: {
      ...process.env,
      DATABASE_URL: database.toString(),
      NODE_ENV: "production",
      INTEGRATION_MODE: "real",
      SERVE_WEB: "true",
      WEB_ORIGIN: origin,
      PORT: String(port),
      LISTEN_ADDRESS: "127.0.0.1",
      ALLOW_HTTP_LAN: "false",
      // cloudflared reaches the app from 127.0.0.1 and appends the real client IP.
      TRUST_PROXY: "loopback",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  app.stdout.pipe(appLog);
  app.stderr.pipe(appLog);
  app.on("error", () => stop(1));
  app.on("exit", () => {
    if (!stopping) stop(1);
  });
  let healthy = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
        signal: AbortSignal.timeout(2000),
      });
      const health = await response.json();
      if (
        response.ok &&
        health.mode === "real" &&
        health.developmentPairing === false
      ) {
        healthy = true;
        break;
      }
    } catch {}
    await delay(250);
  }
  if (!healthy)
    throw Error("Aplicação não iniciou. Veja .data/public-api.log.");
  const state = {
    status: "running",
    url: origin,
    port,
    supervisorPid: process.pid,
    appPid: app.pid,
    tunnelPid: tunnel.pid,
    database: "karaoke_public",
    startedAt: new Date().toISOString(),
  };
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(`Karaoke Míque público: ${origin}`);
  console.log(
    "Modo produção, integrações reais, banco karaoke_public. Ctrl+C encerra o servidor e o túnel.",
  );
} catch (error) {
  console.error(error.message);
  stop(1);
}
