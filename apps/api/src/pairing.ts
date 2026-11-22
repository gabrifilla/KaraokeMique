import type { Pool } from "pg";
import { z } from "zod";
import { requireRule } from "../../../packages/domain/src/index.js";
import { hash } from "./store.js";

export const allowsDevelopmentPairing = (environment: string | undefined) =>
  environment === "development";

export async function resolvePairing(
  pool: Pool,
  body: unknown,
  environment: string | undefined,
) {
  if (allowsDevelopmentPairing(environment)) {
    const input = z
      .object({
        code: z.string().trim().min(1).max(128),
        roomCode: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-F0-9]{8}$/)
          .optional(),
      })
      .parse(body);
    if (input.roomCode) {
      const result = await pool.query("SELECT id FROM rooms WHERE code=$1", [
        input.roomCode,
      ]);
      requireRule(
        result.rowCount,
        "NOT_FOUND",
        "Não encontramos essa sala. Confira o código ou leia o QR da TV de novo.",
        404,
      );
      return { roomId: result.rows[0].id as string, codeHash: undefined };
    }
  }
  // No explicit development environment: always use the production rules.
  const { code } = z.object({ code: z.string().length(24) }).parse(body);
  const codeHash = hash(code);
  const result = await pool.query(
    "SELECT room_id FROM pairings WHERE code_hash=$1",
    [codeHash],
  );
  requireRule(
    result.rowCount,
    "INVALID_PAIR",
    "Código errado. Confira os números e tente de novo.",
    404,
  );
  return { roomId: result.rows[0].room_id as string, codeHash };
}
