import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createRoom, apply } from "../packages/domain/src/index.js";
import type { Room, Command, Video } from "../packages/contracts/src/index.js";
import { pushTargets } from "../apps/api/src/push.js";

const now = 100000;
const video: Video = {
  id: "abcdefghijk",
  title: "Evidências",
  channel: "Canal",
  thumbnail: "",
  duration: 200,
  fetchedAt: now,
};
function room() {
  const r = createRoom("Festa", "Alice", "🎤", now);
  r.people[0].id = "A";
  r.hostId = "A";
  for (const id of ["B", "C"])
    r.people.push({
      id,
      name: id,
      avatar: "🌟",
      status: "ACTIVE",
      turns: 0,
      lastSeen: now,
    });
  r.epoch = 1;
  r.stageSeen = now;
  return r;
}
function run(r: Room, who: string, kind: Command["kind"], payload = {}) {
  apply(
    r,
    who === "stage"
      ? { id: "stage", role: "stage", epoch: r.epoch }
      : { id: who, role: "member" },
    { commandId: randomUUID(), kind, payload },
    now,
    kind === "ADD" ? video : undefined,
  );
}

it("avisa quem canta e quem é o próximo; ninguém mais", () => {
  const r = room();
  run(r, "A", "ADD", { videoId: "a" });
  run(r, "B", "ADD", { videoId: "b" });
  expect(pushTargets(r, now)).toEqual([]);
  run(r, "A", "PREPARE");
  const t = pushTargets(r, now);
  expect(t.map((m) => [m.personId, m.key.split(":")[0]])).toEqual([
    ["A", "turn"],
    ["B", "next"],
  ]);
  expect(t[1].body).toContain("Evidências");
});

it("na votação avisa só quem ainda não votou e não é o cantor", () => {
  const r = room();
  run(r, "A", "ADD", { videoId: "a" });
  run(r, "A", "PREPARE");
  const id = r.current!.id;
  run(r, "stage", "REPORT", { event: "PLAYING", performanceId: id, seq: 1 });
  run(r, "stage", "REPORT", { event: "FINALE", performanceId: id, seq: 2 });
  run(r, "B", "VOTE", { score: 9 });
  const votes = pushTargets(r, now).filter((m) => m.key.startsWith("vote"));
  expect(votes.map((m) => m.personId)).toEqual(["C"]);
});

it("sala encerrada não avisa ninguém", () => {
  const r = room();
  r.state = "CLOSED";
  expect(pushTargets(r, now)).toEqual([]);
});
