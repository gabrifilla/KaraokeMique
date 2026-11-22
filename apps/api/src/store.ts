import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { rooms } from "./schema.js";
import {
  requireRule,
  RuleError,
  maintain,
  authorize,
} from "../../../packages/domain/src/index.js";
import type { Actor, Room } from "../../../packages/contracts/src/index.js";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const secret = () => randomBytes(32).toString("hex");
export async function replaceStage(
  room: Room,
  c: pg.PoolClient,
  token: string,
) {
  requireRule(room.state !== "CLOSED", "ROOM_CLOSED", "Sala encerrada.", 409);
  room.epoch++;
  room.stageSeen = Date.now();
  if (["PREPARING", "PLAYING", "PAUSED"].includes(room.state)) {
    room.recoveryFrom = room.state;
    room.state = "RECOVERY";
  }
  if (room.current) {
    room.current.epoch = room.epoch;
    room.current.lastReport = 0;
  }
  await c.query(
    "DELETE FROM sessions WHERE room_id=$1 AND actor->>'role'='stage'",
    [room.id],
  );
  await c.query(
    "INSERT INTO sessions(token_hash,room_id,actor) VALUES($1,$2,$3)",
    [
      hash(token),
      room.id,
      { id: randomUUID(), role: "stage", epoch: room.epoch },
    ],
  );
}
export class Store {
  pool: pg.Pool;
  db: ReturnType<typeof drizzle>;
  constructor(
    connectionString = process.env.DATABASE_URL ||
      "postgres://karaoke:karaoke@127.0.0.1:54329/karaoke_dev",
  ) {
    this.pool = new pg.Pool({ connectionString, max: 12 });
    this.db = drizzle(this.pool);
  }
  async init() {
    await this.pool.query(
      readFileSync(
        new URL("../migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
  }
  async read(id: string) {
    const [row] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    requireRule(
      row,
      "NOT_FOUND",
      "Não encontramos essa sala. Confira o código ou leia o QR da TV de novo.",
      404,
    );
    return row.data;
  }
  async receipt(token: string, id: string, body: string) {
    const r = await this.pool.query(
      "SELECT payload_hash,response FROM command_receipts WHERE session_hash=$1 AND command_id=$2",
      [hash(token), id],
    );
    if (!r.rowCount) return undefined;
    requireRule(
      r.rows[0].payload_hash === hash(body),
      "COMMAND_CONFLICT",
      "commandId reutilizado com conteúdo diferente.",
      409,
    );
    return r.rows[0].response;
  }
  async session(token: string | undefined, roomId: string) {
    requireRule(token, "UNAUTHORIZED", "Entre na sala para continuar.", 401);
    const r = await this.pool.query(
      "SELECT actor FROM sessions WHERE token_hash=$1 AND room_id=$2 AND expires_at>now()",
      [hash(token), roomId],
    );
    requireRule(
      r.rowCount,
      "UNAUTHORIZED",
      "Seu acesso à sala expirou. Entre de novo pelo QR ou pelo código da sala.",
      401,
    );
    const actor = r.rows[0].actor as Actor;
    authorize(await this.read(roomId), actor);
    return actor;
  }
  async create(room: Room) {
    const token = secret();
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("INSERT INTO rooms VALUES($1,$2,$3,$4)", [
        room.id,
        room.code,
        room.version,
        room,
      ]);
      await c.query(
        "INSERT INTO sessions(token_hash,room_id,actor) VALUES($1,$2,$3)",
        [hash(token), room.id, { id: room.hostId, role: "member" }],
      );
      await c.query("COMMIT");
      return token;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async mutate<T>(
    id: string,
    fn: (room: Room, c: pg.PoolClient) => Promise<T> | T,
    receipt?: { token: string; id: string; body: string },
  ) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const rows = await c.query(
        "SELECT data FROM rooms WHERE id=$1 FOR UPDATE",
        [id],
      );
      requireRule(
        rows.rowCount,
        "NOT_FOUND",
        "Não encontramos essa sala. Confira o código ou leia o QR da TV de novo.",
        404,
      );
      if (receipt) {
        const prior = await c.query(
          "SELECT * FROM command_receipts WHERE session_hash=$1 AND command_id=$2",
          [hash(receipt.token), receipt.id],
        );
        if (prior.rowCount) {
          requireRule(
            prior.rows[0].payload_hash === hash(receipt.body),
            "COMMAND_CONFLICT",
            "commandId reutilizado com conteúdo diferente.",
            409,
          );
          await c.query("COMMIT");
          return prior.rows[0].response as T;
        }
      }
      const room = rows.rows[0].data as Room;
      const result = await fn(room, c);
      room.version++;
      await c.query("UPDATE rooms SET data=$2,version=$3 WHERE id=$1", [
        id,
        room,
        room.version,
      ]);
      await c.query("INSERT INTO outbox(room_id,version) VALUES($1,$2)", [
        id,
        room.version,
      ]);
      if (receipt)
        await c.query("INSERT INTO command_receipts VALUES($1,$2,$3,$4)", [
          hash(receipt.token),
          receipt.id,
          hash(receipt.body),
          JSON.stringify(result ?? {}),
        ]);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async sweep() {
    const all = await this.pool.query(
      "SELECT id FROM rooms WHERE data->>'state'<>'CLOSED'",
    );
    for (const { id } of all.rows) {
      const r = await this.read(id);
      const before = JSON.stringify(r);
      maintain(r, Date.now());
      if (JSON.stringify(r) !== before)
        await this.mutate(id, (room) => {
          maintain(room, Date.now());
          return {};
        });
    }
    await this.pool.query(
      "DELETE FROM rooms WHERE data->>'state'='CLOSED' AND (data->>'closedAt')::bigint < $1",
      [Date.now() - 86400000],
    );
    await this.pool.query("DELETE FROM sessions WHERE expires_at<now()");
    await this.pool.query("DELETE FROM pairings WHERE expires_at<now()");
    await this.pool.query("DELETE FROM tv_pairings WHERE expires_at<now()");
  }
}
