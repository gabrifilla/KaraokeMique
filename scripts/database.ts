import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "pg";

const databaseDir = resolve(".data/postgres");
const connection = {
  host: "127.0.0.1",
  port: 54329,
  user: "karaoke",
  password: "karaoke",
  database: "postgres",
  connectionTimeoutMillis: 3000,
};

async function ensureDatabase(client: postgres.Client) {
  if (
    !(
      await client.query(
        "SELECT 1 FROM pg_database WHERE datname='karaoke_dev'",
      )
    ).rowCount
  )
    await client.query(
      "CREATE DATABASE karaoke_dev ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'",
    );
}

async function reuseRunningDatabase() {
  const client = new postgres.Client(connection);
  try {
    await client.connect();
  } catch (error) {
    await client.end();
    if ((error as NodeJS.ErrnoException).code === "ECONNREFUSED") return false;
    throw error;
  }
  try {
    const result = await client.query<{ directory: string }>(
      "SELECT current_setting('data_directory') AS directory",
    );
    const normalize = (path: string) => {
      const absolute = resolve(path);
      return process.platform === "win32" ? absolute.toLowerCase() : absolute;
    };
    if (normalize(result.rows[0].directory) !== normalize(databaseDir))
      throw new Error(
        "A porta 54329 está ocupada por outro PostgreSQL. Use apenas um banco nessa porta.",
      );
    await ensureDatabase(client);
    console.log(
      "PostgreSQL local já está ativo em 127.0.0.1:54329; karaoke_dev disponível. Pode executar pnpm dev em outro terminal. A instância existente foi preservada.",
    );
    return true;
  } finally {
    await client.end();
  }
}

async function main() {
  if (await reuseRunningDatabase()) return;

  mkdirSync(".data", { recursive: true });
  const startupLogs: string[] = [];
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: connection.user,
    password: connection.password,
    port: connection.port,
    persistent: true,
    postgresFlags: ["-h", connection.host],
    onLog: (message) => {
      startupLogs.push(message);
      if (startupLogs.length > 30) startupLogs.shift();
    },
    onError: console.error,
  });
  try {
    if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
    await pg.start();
  } catch (error) {
    throw new Error(
      `Não foi possível iniciar o PostgreSQL local.\n${startupLogs.join("")}`,
      { cause: error },
    );
  }

  const keepAlive = setInterval(() => {}, 60000);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(keepAlive);
    await pg.stop();
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      void stop().catch((error: unknown) => {
        console.error("Falha ao encerrar PostgreSQL local:", error);
        process.exitCode = 1;
      });
    });

  const client = new postgres.Client(connection);
  try {
    await client.connect();
    await ensureDatabase(client);
    console.log("PostgreSQL local em 127.0.0.1:54329. Ctrl+C para parar.");
  } catch (error) {
    await stop();
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Falha no banco local:", error);
  process.exitCode = 1;
});
