import { randomUUID } from "node:crypto";
import type { Video } from "../../../packages/contracts/src/index.js";
import {
  apply,
  canAutoPrepare,
  forecast,
} from "../../../packages/domain/src/index.js";
import type { Store } from "./store.js";

export async function prepareAutomatically(
  store: Store,
  id: string,
  validate: (id: string) => Promise<Video>,
  now = Date.now,
) {
  const before = await store.read(id);
  if (!canAutoPrepare(before, now())) return;
  const song = forecast(before, now())[0];
  try {
    await validate(song.video.id);
  } catch {
    await store.mutate(id, (room) => {
      if (
        canAutoPrepare(room, now()) &&
        forecast(room, now())[0]?.id === song.id
      ) {
        room.settings.autoPlay = false;
        room.autoPlayError =
          "A próxima música não pôde ser validada no YouTube. A fila foi preservada. Tente novamente ou remova essa música.";
      }
    });
    return;
  }
  await store.mutate(id, (room) => {
    // Recheck under the room lock: host actions and competing workers may have won.
    if (
      !canAutoPrepare(room, now()) ||
      forecast(room, now())[0]?.id !== song.id
    )
      return;
    apply(
      room,
      { id: room.hostId, role: "member" },
      { kind: "PREPARE", commandId: randomUUID(), payload: {} },
      now(),
    );
    room.autoPlayError = undefined;
  });
}
