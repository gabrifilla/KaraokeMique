import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const name = `karaoke_e2e_${randomUUID().replaceAll("-", "")}`;
const database = new URL(
  process.env.DATABASE_URL ||
    "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev",
);
const admin = new pg.Pool({ connectionString: database.toString() });
await admin.query(
  `CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
);
database.pathname = `/${name}`;
mkdirSync(".data", { recursive: true });
writeFileSync(".data/e2e-database.json", JSON.stringify({ name }));
const child = spawn("pnpm dev", {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: database.toString() },
});
let stopping = false;
async function cleanup() {
  if (stopping) return;
  stopping = true;
  if (child.pid) {
    try {
      if (process.platform === "win32")
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      else child.kill("SIGTERM");
    } catch {
      /* The server may already have exited. */
    }
  }
  if (!/^karaoke_e2e_[a-f0-9]{32}$/.test(name))
    throw new Error("Nome de banco E2E inválido");
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.end();
}
child.on("exit", (code) => {
  void cleanup().finally(() => process.exit(code || 0));
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void cleanup().finally(() => process.exit(0));
  });
