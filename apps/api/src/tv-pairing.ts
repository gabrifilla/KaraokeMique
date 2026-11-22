import { randomInt, randomUUID } from "node:crypto";
import { authorize, requireRule } from "../../../packages/domain/src/index.js";
import type { Actor } from "../../../packages/contracts/src/index.js";
import { hash, secret, replaceStage, type Store } from "./store.js";

export async function createTvPairing(store: Store) {
  const deviceToken = secret();
  const expiresAt = Date.now() + 300000;
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = randomUUID(),
      code = String(randomInt(0, 1000000)).padStart(6, "0");
    const result = await store.pool.query(
      "INSERT INTO tv_pairings(id,code,device_hash,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT(code) DO NOTHING",
      [id, code, hash(deviceToken), new Date(expiresAt)],
    );
    if (result.rowCount) return { id, code, deviceToken, expiresAt };
  }
  throw new Error("Não foi possível gerar código de TV.");
}
export async function approveTvPairing(
  store: Store,
  roomId: string,
  actor: Actor,
  code: string,
) {
  await store.mutate(roomId, async (room, c) => {
    authorize(room, actor);
    requireRule(
      actor.role === "member" && actor.id === room.hostId,
      "HOST_ONLY",
      "Só o anfitrião pode ligar a TV.",
      403,
    );
    requireRule(room.state !== "CLOSED", "ROOM_CLOSED", "Sala encerrada.", 409);
    const result = await c.query(
      "SELECT * FROM tv_pairings WHERE code=$1 AND expires_at>now() AND consumed=false FOR UPDATE",
      [code],
    );
    requireRule(
      result.rowCount,
      "TV_EXPIRED",
      "Esse número da TV expirou ou está errado. Na TV, toque em Gerar outro código e tente de novo.",
      404,
    );
    requireRule(
      !result.rows[0].room_id || result.rows[0].room_id === roomId,
      "TV_USED",
      "Essa TV já está ligada em outra festa. Abra o site na TV de novo para gerar outro QR.",
      409,
    );
    await c.query("UPDATE tv_pairings SET room_id=$2 WHERE id=$1", [
      result.rows[0].id,
      roomId,
    ]);
  });
}
export async function redeemTvPairing(
  store: Store,
  id: string,
  deviceToken: string,
) {
  const result = await store.pool.query(
    "SELECT * FROM tv_pairings WHERE id=$1 AND device_hash=$2 AND expires_at>now()",
    [id, hash(deviceToken)],
  );
  requireRule(
    result.rowCount,
    "TV_EXPIRED",
    "O QR da TV expirou. Toque em Gerar outro código.",
    404,
  );
  const pairing = result.rows[0];
  if (!pairing.room_id) return { state: "WAITING" as const };
  if (pairing.consumed)
    return { state: "PAIRED" as const, roomId: pairing.room_id as string };
  const token = secret();
  await store.mutate(pairing.room_id, async (room, c) => {
    const locked = await c.query(
      "UPDATE tv_pairings SET consumed=true WHERE id=$1 AND device_hash=$2 AND room_id=$3 AND expires_at>now() AND consumed=false RETURNING id",
      [id, hash(deviceToken), room.id],
    );
    requireRule(
      locked.rowCount,
      "TV_USED",
      "Esse QR já foi usado. Abra o site na TV de novo para gerar outro.",
      409,
    );
    await replaceStage(room, c, token);
  });
  return { state: "PAIRED" as const, roomId: pairing.room_id as string, token };
}
