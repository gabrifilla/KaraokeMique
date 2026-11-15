import "dotenv/config";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import pg from "pg";

export default async function teardown() {
  const file = ".data/e2e-database.json";
  if (!existsSync(file)) return;
  const { name } = JSON.parse(readFileSync(file, "utf8"));
  if (typeof name !== "string" || !/^karaoke_e2e_[a-f0-9]{32}$/.test(name))
    throw new Error("Banco E2E não verificado");
  const pool = new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev",
  });
  try {
    await pool.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    unlinkSync(file);
  } finally {
    await pool.end();
  }
}
