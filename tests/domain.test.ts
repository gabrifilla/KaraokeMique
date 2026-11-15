import { describe, it, expect } from "vitest";
import {
  createRoom,
  apply,
  forecast,
  finishVoting,
  maintain,
  project,
  searchQuery,
  canAutoPrepare,
} from "../packages/domain/src/index.js";
import type {
  Room,
  Actor,
  Command,
  Video,
} from "../packages/contracts/src/index.js";
import { randomUUID } from "node:crypto";
const now = 100000;
it("som e tamanho dos GIFs só podem ser configurados pelo anfitrião e sobrevivem ao snapshot", () => {
  const room = fixture();
  expect(() =>
    run(room, "B", "SETTINGS", { scoreSound: false, gifDisplay: "expanded" }),
  ).toThrow();
  expect(() =>
    run(room, "stage", "SETTINGS", { gifDisplay: "minimized" }),
  ).toThrow();
  run(room, "A", "SETTINGS", { scoreSound: false, gifDisplay: "expanded" });
  const reconnected = JSON.parse(JSON.stringify(room)) as Room;
  expect(reconnected.settings.scoreSound).toBe(false);
  expect(reconnected.settings.gifDisplay).toBe("expanded");
  for (const invalid of [null, true, "arbitrary", {}])
    expect(() => run(room, "A", "SETTINGS", { gifDisplay: invalid })).toThrow(
      "tamanho válido",
    );
  expect(() => run(room, "A", "SETTINGS", { scoreSound: "false" })).toThrow();
  expect(room.settings.gifDisplay).toBe("expanded");
});
it("fila automática respeita resultado, decisão de bis, pausa e presença do palco", () => {
  const r = fixture();
  run(r, "A", "ADD", {});
  expect(canAutoPrepare(r, now)).toBe(true);
  r.state = "PAUSED";
  expect(canAutoPrepare(r, now)).toBe(false);
  r.state = "RECOVERY";
  expect(canAutoPrepare(r, now)).toBe(false);
  r.state = "RESULTS";
  r.current = {
    id: "p",
    songId: "x",
    singerId: "A",
    epoch: 1,
    lastReport: 0,
    turnApplied: true,
    turnReverted: false,
    isEncore: false,
    round: {
      eligible: [],
      votes: {},
      openedAt: now,
      deadline: now,
      closedAt: now,
    },
  };
  expect(canAutoPrepare(r, now + 4999)).toBe(false);
  expect(canAutoPrepare(r, now + 5000)).toBe(true);
  r.offer = { personId: "A", songId: r.songs[0].id, state: "OFFERED" };
  expect(canAutoPrepare(r, now + 9999)).toBe(false);
  expect(canAutoPrepare(r, now + 10000)).toBe(true);
  r.offer.state = "ACCEPTED";
  expect(canAutoPrepare(r, now + 5000)).toBe(true);
  r.settings.autoPlay = false;
  expect(canAutoPrepare(r, now + 5000)).toBe(false);
  r.settings.autoPlay = true;
  expect(canAutoPrepare(r, now + 15000)).toBe(false);
});
const video: Video = {
  id: "abcdefghijk",
  title: "Canção",
  channel: "Canal",
  thumbnail: "",
  duration: 120,
  fetchedAt: now,
};
function fixture() {
  const room = createRoom("Festa", "Alice", "🎤", now);
  room.people[0].id = "A";
  room.hostId = "A";
  for (const id of ["B", "C"])
    room.people.push({
      id,
      name: id,
      avatar: "🌟",
      status: "ACTIVE",
      turns: 0,
      lastSeen: now,
    });
  room.epoch = 1;
  room.stageSeen = now;
  return room;
}
function run(
  r: Room,
  who: string,
  kind: Command["kind"],
  payload: Record<string, unknown> = {},
  at = now,
) {
  apply(
    r,
    who === "stage"
      ? { id: "stage", role: "stage", epoch: r.epoch }
      : { id: who, role: "member" },
    { commandId: randomUUID(), kind, payload },
    at,
    kind === "ADD"
      ? { ...video, id: (payload.videoId as string) || video.id }
      : undefined,
  );
}
function song(r: Room, who: string, id: string) {
  run(r, who, "ADD", { videoId: id });
  r.songs.at(-1)!.id = id;
}
function playing(r: Room) {
  song(r, "A", "A1");
  run(r, "A", "PREPARE");
  run(r, "stage", "REPORT", {
    event: "PLAYING",
    performanceId: r.current!.id,
    seq: 1,
  });
}
function voting(r: Room) {
  playing(r);
  run(r, "stage", "REPORT", {
    event: "ENDED",
    performanceId: r.current!.id,
    seq: 2,
  });
}
describe("Fila justa", () => {
  it("simula turnos, preservando FIFO de cada cantor", () => {
    const r = fixture();
    for (const s of ["A1", "A2", "A3", "B1", "C1", "B2"]) song(r, s[0], s);
    expect(forecast(r, now).map((x) => x.id)).toEqual([
      "A1",
      "B1",
      "C1",
      "A2",
      "B2",
      "A3",
    ]);
  });
  it("prioriza chegada nova com zero turnos", () => {
    const r = fixture();
    r.people[0].turns = 2;
    r.people[1].turns = 1;
    for (const s of ["A3", "B2", "C1", "C2"]) song(r, s[0], s);
    expect(forecast(r, now).map((x) => x.id)).toEqual(["C1", "B2", "C2", "A3"]);
  });
  it("não desloca a reserva e suspende ausência após 60s", () => {
    const r = fixture();
    song(r, "A", "A1");
    run(r, "A", "PREPARE");
    song(r, "B", "B1");
    expect(r.current?.songId).toBe("A1");
    r.people[1].lastSeen = now - 60000;
    expect(forecast(r, now)).toEqual([]);
    r.people[1].lastSeen = now;
    expect(forecast(r, now)[0].id).toBe("B1");
  });
  it("variação de tamanhos não permite monopolizar empate", () => {
    for (let n = 1; n <= 20; n++) {
      const r = fixture();
      for (let i = 0; i < Math.min(n, 5); i++) song(r, "A", `A${i}`);
      song(r, "B", "B1");
      song(r, "C", "C1");
      expect(
        forecast(r, now)
          .slice(0, 3)
          .map((s) => s.personId),
      ).toEqual(["A", "B", "C"]);
    }
  });
});
describe("Votação e bis", () => {
  it("aceita zero e dez, fecha cedo e calcula média; projeção oculta votos", () => {
    const r = fixture();
    voting(r);
    run(r, "B", "VOTE", { score: 0 });
    const dto = project(r, { id: "C", role: "member" }, now, "real");
    expect(JSON.stringify(dto)).not.toContain('"votes"');
    expect(JSON.stringify(dto)).not.toContain('"eligible":');
    run(r, "C", "VOTE", { score: 10 });
    expect(r.state).toBe("RESULTS");
    expect(r.current!.round!.average).toBe(5);
  });
  it.each([-1, 11, 8.5, "10", null])("recusa nota inválida %s", (score) => {
    const r = fixture();
    voting(r);
    expect(() => run(r, "B", "VOTE", { score })).toThrow("inteira");
  });
  it("recusa autovoto, voto duplo, não membro e voto no deadline", () => {
    const r = fixture();
    voting(r);
    expect(() => run(r, "A", "VOTE", { score: 10 })).toThrow("si");
    expect(() => run(r, "X", "VOTE", { score: 10 })).toThrow();
    run(r, "B", "VOTE", { score: 9 });
    expect(() => run(r, "B", "VOTE", { score: 9 })).toThrow("registrado");
    expect(() => run(r, "C", "VOTE", { score: 9 }, now + 10000)).toThrow(
      "terminou",
    );
  });
  it("aceita antes do limite, nunca inclui entrante tardio", () => {
    const r = fixture();
    voting(r);
    r.people.push({
      id: "D",
      name: "D",
      avatar: "🌟",
      turns: 0,
      status: "ACTIVE",
      lastSeen: now,
    });
    expect(() => run(r, "D", "VOTE", { score: 10 })).toThrow("participa");
    run(r, "B", "VOTE", { score: 10 }, now + 9999);
    maintain(r, now + 10000);
    expect(r.current!.round!.count).toBe(1);
    expect(r.offer).toBeUndefined();
  });
  it("zero elegíveis encerra imediatamente com média nula", () => {
    const r = fixture();
    r.people = r.people.slice(0, 1);
    voting(r);
    expect(r.state).toBe("RESULTS");
    expect(r.current!.round!.average).toBeNull();
  });
  it("média arredondada 10,0 e voto único não geram bônus", () => {
    const r = fixture();
    voting(r);
    song(r, "A", "A2");
    const round = r.current!.round!;
    round.votes = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [String(i), i === 29 ? 9 : 10]),
    );
    finishVoting(r, now + 500);
    expect(round.average!.toFixed(1)).toBe("10.0");
    expect(r.offer).toBeUndefined();
  });
  it("oferece item existente, promoção única e bis não gera bis", () => {
    const r = fixture();
    voting(r);
    song(r, "A", "A2");
    run(r, "B", "VOTE", { score: 10 });
    run(r, "C", "VOTE", { score: 10 });
    expect(r.offer?.songId).toBe("A2");
    run(r, "A", "ENCORE", { accept: true });
    run(r, "A", "ENCORE", { accept: true });
    expect(forecast(r, now)[0].id).toBe("A2");
    expect(() => run(r, "A", "PREPARE")).toThrow("cinco");
    r.stageSeen = now + 5000;
    run(r, "A", "PREPARE", {}, now + 5000);
    expect(r.current?.isEncore).toBe(true);
    run(
      r,
      "stage",
      "REPORT",
      { event: "PLAYING", performanceId: r.current!.id, seq: 1 },
      now + 5000,
    );
    song(r, "A", "A3");
    run(
      r,
      "stage",
      "REPORT",
      { event: "ENDED", performanceId: r.current!.id, seq: 2 },
      now + 5000,
    );
    run(r, "B", "VOTE", { score: 10 }, now + 5000);
    run(r, "C", "VOTE", { score: 10 }, now + 5000);
    expect(r.offer?.state).toBe("CONSUMED");
  });
  it("bis bloqueia nova prioridade antes de quatro músicas, inclusive após reconexão", () => {
    let r = fixture();
    let tick = now;
    const advance = () => {
      tick += 5000;
      r.stageSeen = tick;
      r.people.forEach((p) => (p.lastSeen = tick));
      run(r, "A", "PREPARE", {}, tick);
    };
    const complete = (score: number) => {
      run(
        r,
        "stage",
        "REPORT",
        { event: "PLAYING", performanceId: r.current!.id, seq: 1 },
        tick,
      );
      run(
        r,
        "stage",
        "REPORT",
        { event: "ENDED", performanceId: r.current!.id, seq: 2 },
        tick,
      );
      for (const voter of [...r.current!.round!.eligible])
        run(r, voter, "VOTE", { score }, tick);
    };
    voting(r);
    song(r, "A", "A2");
    song(r, "A", "A3");
    song(r, "B", "B1");
    song(r, "C", "C1");
    run(r, "B", "VOTE", { score: 10 });
    run(r, "C", "VOTE", { score: 10 });
    run(r, "A", "ENCORE", { accept: true });
    advance();
    expect(r.current!.songId).toBe("A2");
    expect(r.current!.isEncore).toBe(true);
    complete(10);
    expect(r.offer!.state).toBe("CONSUMED");
    advance();
    expect(r.current!.singerId).toBe("B");
    complete(8);
    advance();
    expect(r.current!.singerId).toBe("C");
    complete(8);
    advance();
    expect(r.current!.songId).toBe("A3");
    expect(r.current!.isEncore).toBe(false);
    // A sala é reidratada com o mesmo histórico persistido, sem contador no cliente.
    r = JSON.parse(JSON.stringify(r)) as Room;
    run(r, "A", "ADD", { videoId: "A4" }, tick);
    run(r, "B", "ADD", { videoId: "B2" }, tick);
    complete(10);
    expect(r.current!.round!.average).toBe(10);
    expect(["OFFERED", "ACCEPTED"]).not.toContain(r.offer?.state);
    expect(() => run(r, "A", "ENCORE", { accept: true }, tick)).toThrow(
      "quatro músicas",
    );
    advance();
    expect(r.songs.find((s) => s.id === r.current!.songId)!.video.id).toBe(
      "B2",
    );
    // O limite de A não impede B de ganhar sua primeira prioridade.
    run(r, "B", "ADD", { videoId: "B3" }, tick);
    complete(10);
    expect(r.offer).toMatchObject({
      personId: "B",
      songId: r.songs.find((s) => s.video.id === "B3")!.id,
      state: "OFFERED",
    });
  });
  it.each(["SKIP", "TECHNICAL_CANCEL"] as const)(
    "%s não devolve o direito de pular a fila após o bis ser selecionado",
    (kind) => {
      const r = fixture();
      voting(r);
      song(r, "A", "A2");
      run(r, "B", "VOTE", { score: 10 });
      run(r, "C", "VOTE", { score: 10 });
      run(r, "A", "ENCORE", { accept: true });
      r.stageSeen = now + 5000;
      run(r, "A", "PREPARE", {}, now + 5000);
      run(r, "A", kind, {}, now + 5000);
      expect(() => run(r, "A", "ENCORE", { accept: true }, now + 5000)).toThrow(
        "quatro músicas",
      );
    },
  );
  it("oferta antiga durante cooldown é cancelada e não promove outra música", () => {
    const r = fixture();
    voting(r);
    song(r, "A", "A2");
    song(r, "B", "B1");
    finishVoting(r, now);
    r.history.push({
      ...structuredClone(r.current!),
      id: "bis-anterior",
      isEncore: true,
    });
    r.offer = { personId: "A", songId: "A2", state: "ACCEPTED" };
    expect(forecast(r, now)[0].id).toBe("B1");
    expect(() => run(r, "A", "ENCORE", { accept: true })).toThrow(
      "quatro músicas",
    );
    maintain(r, now);
    expect(r.offer.state).toBe("CANCELLED");
  });
  it.each([0, 1, 2, 3, 4])(
    "libera novo bis somente quando a votação atual completa a quarta música: %i anteriores",
    (completedBefore) => {
      const r = fixture();
      voting(r);
      song(r, "A", "A2");
      const past = {
        ...structuredClone(r.current!),
        id: "ultimo-bis",
        isEncore: true,
        outcome: "COMPLETED",
      };
      r.history.push(past);
      for (let i = 0; i < completedBefore; i++)
        r.history.push({
          ...structuredClone(past),
          id: `normal-${i}`,
          singerId: i % 2 ? "B" : "C",
          isEncore: false,
        });
      run(r, "B", "VOTE", { score: 10 });
      run(r, "C", "VOTE", { score: 10 });
      // A apresentação normal atual conta apenas depois de ser concluída.
      expect(r.offer?.state === "OFFERED").toBe(completedBefore + 1 >= 4);
      if (completedBefore + 1 >= 4) {
        run(r, "A", "ENCORE", { accept: true });
        expect(forecast(r, now)[0].id).toBe("A2");
      } else
        expect(() => run(r, "A", "ENCORE", { accept: true })).toThrow(
          "quatro músicas",
        );
    },
  );
  it("pulos/falhas não contam e um novo bis reinicia o cooldown", () => {
    const r = fixture();
    voting(r);
    song(r, "A", "A2");
    const past = {
      ...structuredClone(r.current!),
      id: "bis-antigo",
      isEncore: true,
      outcome: "COMPLETED",
    };
    r.history.push(past);
    for (let i = 0; i < 5; i++)
      r.history.push({
        ...structuredClone(past),
        id: `antes-${i}`,
        isEncore: false,
        singerId: "B",
      });
    r.history.push({ ...structuredClone(past), id: "bis-mais-recente" });
    for (let i = 0; i < 2; i++)
      r.history.push({
        ...structuredClone(past),
        id: `depois-${i}`,
        isEncore: false,
        singerId: "B",
      });
    r.history.push({
      ...structuredClone(past),
      id: "pulo",
      isEncore: false,
      outcome: "SKIPPED",
    });
    r.history.push({
      ...structuredClone(past),
      id: "falha",
      isEncore: false,
      outcome: "FAILED",
    });
    run(r, "B", "VOTE", { score: 10 });
    run(r, "C", "VOTE", { score: 10 });
    expect(r.offer).toBeUndefined();
    expect(() => run(r, "A", "ENCORE", { accept: true })).toThrow(
      "quatro músicas",
    );
  });
  it("música adicionada depois não gera crédito retroativo", () => {
    const r = fixture();
    voting(r);
    run(r, "B", "VOTE", { score: 10 });
    run(r, "C", "VOTE", { score: 10 });
    song(r, "A", "A2");
    expect(r.offer).toBeUndefined();
  });
  it("remoção invalida voto aberto; resultado finalizado permanece", () => {
    const r = fixture();
    voting(r);
    run(r, "B", "VOTE", { score: 10 });
    run(r, "A", "REMOVE_PERSON", { personId: "B" });
    expect(r.current!.round!.votes).toEqual({});
    run(r, "C", "VOTE", { score: 8 });
    run(r, "A", "REMOVE_PERSON", { personId: "C" });
    expect(r.current!.round!.average).toBe(8);
  });
  it("fechamento durante votação não oferece bis", () => {
    const r = fixture();
    voting(r);
    song(r, "A", "A2");
    run(r, "B", "VOTE", { score: 10 });
    run(r, "A", "CLOSE");
    expect(r.current!.round!.reason).toBe("ROOM_CLOSED");
    expect(r.offer).toBeUndefined();
    expect(() => run(r, "C", "VOTE", { score: 10 })).toThrow("encerrada");
  });
});
describe("Reprodução e autorização", () => {
  it("início duplicado não conta duas vezes, término duplicado não reabre", () => {
    const r = fixture();
    playing(r);
    run(r, "stage", "REPORT", {
      event: "PLAYING",
      performanceId: r.current!.id,
      seq: 2,
    });
    expect(r.people[0].turns).toBe(1);
    run(r, "stage", "REPORT", {
      event: "ENDED",
      performanceId: r.current!.id,
      seq: 3,
    });
    const deadline = r.current!.round!.deadline;
    run(
      r,
      "stage",
      "REPORT",
      { event: "ENDED", performanceId: r.current!.id, seq: 4 },
      now + 5,
    );
    expect(r.current!.round!.deadline).toBe(deadline);
  });
  it("cancelamento técnico devolve exatamente uma vez; skip consome", () => {
    const r = fixture();
    playing(r);
    run(r, "A", "TECHNICAL_CANCEL");
    expect(r.people[0].turns).toBe(0);
    expect(() => run(r, "A", "TECHNICAL_CANCEL")).toThrow();
    playing(r);
    run(r, "A", "SKIP");
    expect(r.people[0].turns).toBe(1);
  });
  it("palco antigo e participante não confirmam playback", () => {
    const r = fixture();
    playing(r);
    r.epoch = 2;
    expect(() =>
      apply(
        r,
        { id: "s", role: "stage", epoch: 1 },
        {
          commandId: randomUUID(),
          kind: "REPORT",
          payload: { event: "ENDED" },
        },
        now,
      ),
    ).toThrow("substituído");
    expect(() =>
      run(r, "B", "REPORT", {
        performanceId: r.current!.id,
        seq: 2,
        event: "ENDED",
      }),
    ).toThrow("palco");
  });
  it("perda do palco recupera sem interromper votação", () => {
    const r = fixture();
    playing(r);
    maintain(r, now + 15000);
    expect(r.state).toBe("RECOVERY");
    const v = fixture();
    voting(v);
    maintain(v, now + 15000);
    expect(v.state).toBe("RESULTS");
  });
  it("transferência revoga imediatamente antigo anfitrião", () => {
    const r = fixture();
    run(r, "A", "TRANSFER", { personId: "B" });
    expect(() => run(r, "A", "CLOSE")).toThrow("anfitrião");
    run(r, "B", "CLOSE");
    expect(r.state).toBe("CLOSED");
  });
  it("nunca deixa anfitrião sair ou se remover", () => {
    const r = fixture();
    expect(() => run(r, "A", "LEAVE")).toThrow("Transfira");
    expect(() => run(r, "A", "REMOVE_PERSON", { personId: "A" })).toThrow(
      "anfitrião",
    );
  });
});
it("busca mantém texto e inclui karaoke sem duplicar", () => {
  expect(searchQuery("right  through me")).toBe("right through me karaoke");
  expect(searchQuery("Música KARAOKE")).toBe("Música KARAOKE");
  expect(searchQuery("karoke")).toBe("karoke karaoke");
});
