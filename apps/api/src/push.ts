import webpush from "web-push";
import type { Room } from "../../../packages/contracts/src/index.js";
import {
  active,
  canVote,
  forecast,
  votingOpen,
} from "../../../packages/domain/src/index.js";
import type { Store } from "./store.js";

export interface PushMessage {
  personId: string;
  /** Identifica o aviso: cada um vai uma única vez por pessoa. */
  key: string;
  title: string;
  body: string;
}

const PLAYBACK = ["PREPARING", "PLAYING", "PAUSED"];

/** Quem deve receber aviso agora: é a vez, é o próximo ou pode votar. */
export function pushTargets(room: Room, now: number): PushMessage[] {
  if (room.state === "CLOSED") return [];
  const out: PushMessage[] = [];
  const p = room.current;
  const song = (id?: string) => room.songs.find((s) => s.id === id)?.video;
  if (p && PLAYBACK.includes(room.state)) {
    out.push({
      personId: p.singerId,
      key: `turn:${p.id}`,
      title: "🎤 É a sua vez!",
      body: `Pegue o microfone: ${song(p.songId)?.title ?? "sua música"} vai começar.`,
    });
    const next = forecast(room, now)[0];
    if (next && next.personId !== p.singerId)
      out.push({
        personId: next.personId,
        key: `next:${p.id}`,
        title: "⏭️ Você é o próximo!",
        body: `Fique perto do microfone. Depois desta música é você com ${next.video.title}.`,
      });
  }
  if (p && votingOpen(room, now)) {
    const singer = room.people.find((x) => x.id === p.singerId)?.name;
    for (const person of room.people)
      if (
        active(person, now) &&
        person.id !== p.singerId &&
        p.round?.votes[person.id] === undefined &&
        canVote(room, person.id, now)
      )
        out.push({
          personId: person.id,
          key: `vote:${p.id}`,
          title: "⭐ Hora de dar a nota!",
          body: `${singer ?? "Quem cantou"} merece quanto? Toque para votar.`,
        });
  }
  return out;
}

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
export const pushEnabled = !!(publicKey && privateKey);
if (pushEnabled)
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:karaoke@example.invalid",
    publicKey,
    privateKey,
  );
export const pushPublicKey = pushEnabled ? publicKey : null;

const sent = new Map<string, number>();
function firstTime(key: string, now: number) {
  if (sent.has(key)) return false;
  if (sent.size > 20000)
    for (const [k, at] of sent) if (now - at > 3600000) sent.delete(k);
  sent.set(key, now);
  return true;
}

export async function notifyRoom(store: Store, room: Room, now = Date.now()) {
  if (!pushEnabled) return;
  for (const message of pushTargets(room, now)) {
    if (!firstTime(`${room.id}:${message.key}:${message.personId}`, now))
      continue;
    const subs = await store.pool.query(
      "SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE room_id=$1 AND person_id=$2",
      [room.id, message.personId],
    );
    for (const sub of subs.rows)
      await webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: message.title,
            body: message.body,
            url: `/r/${room.id}`,
            tag: message.key,
          }),
          { TTL: 120, urgency: "high" },
        )
        .catch(async (e: { statusCode?: number }) => {
          // Inscrição cancelada no aparelho: não tenta de novo.
          if (e.statusCode === 404 || e.statusCode === 410)
            await store.pool.query(
              "DELETE FROM push_subscriptions WHERE endpoint=$1",
              [sub.endpoint],
            );
        });
  }
}
