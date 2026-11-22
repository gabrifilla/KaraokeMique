import { randomUUID } from "node:crypto";
import type {
  Round,
  Room,
  Song,
  Actor,
  Command,
  Video,
  Person,
  Performance,
} from "../../contracts/src/index.js";
export class RuleError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
export function requireRule(
  ok: unknown,
  code: string,
  message: string,
  status = 422,
): asserts ok {
  if (!ok) throw new RuleError(code, message, status);
}
// Celular bloqueado derruba o socket, mas a pessoa continua na festa: a fila
// só suspende os itens após uma ausência longa (ou ao sair/ser removida).
export const QUEUE_ABSENCE_MS = 2 * 60 * 60 * 1000;
export const active = (p: Person, now: number) =>
  p.status === "ACTIVE" && now - p.lastSeen < QUEUE_ABSENCE_MS;
export function searchQuery(q: string) {
  const s = q.trim().replace(/\s+/g, " ");
  return /\bkaraoke\b/i.test(s) ? s : `${s} karaoke`;
}
// O histórico persistido também cobre salas abertas antes desta regra e reconexões.
function encoreOnCooldown(room: Room, personId: string) {
  const performances = room.current
    ? [...room.history, room.current]
    : room.history;
  // O próprio bis não conta; pulo/falha também não encurtam a espera.
  let completed = 0;
  for (let i = performances.length - 1; i >= 0; i--) {
    const p = performances[i];
    if (p.singerId === personId && p.isEncore) return completed < 4;
    if (p.outcome === "COMPLETED") completed++;
  }
  return false;
}
export function forecast(room: Room, now: number): Song[] {
  const turns = new Map(
    room.people.filter((p) => active(p, now)).map((p) => [p.id, p.turns]),
  );
  const waiting = room.songs.filter(
    (s) => s.status === "WAITING" && turns.has(s.personId),
  );
  const result: Song[] = [];
  while (waiting.length) {
    waiting.sort(
      (a, b) =>
        turns.get(a.personId)! - turns.get(b.personId)! ||
        a.seq - b.seq ||
        a.personId.localeCompare(b.personId),
    );
    const bonus =
      result.length === 0 &&
      room.offer?.state === "ACCEPTED" &&
      !encoreOnCooldown(room, room.offer.personId)
        ? waiting.findIndex((s) => s.id === room.offer!.songId)
        : -1;
    const [song] = waiting.splice(bonus >= 0 ? bonus : 0, 1);
    result.push(song);
    turns.set(song.personId, turns.get(song.personId)! + 1);
  }
  return result;
}
export function createRoom(
  name: string,
  personName: string,
  avatar: string,
  now: number,
): Room {
  const id = randomUUID();
  const hostId = randomUUID();
  return {
    id,
    code: randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase(),
    name: name || "Palco da galera",
    hostId,
    state: "LOBBY",
    version: 1,
    nextSeq: 1,
    people: [
      {
        id: hostId,
        name: personName,
        avatar,
        status: "ACTIVE",
        turns: 0,
        lastSeen: now,
      },
    ],
    songs: [],
    history: [],
    epoch: 0,
    stageSeen: 0,
    settings: { entry: true, reactions: true, gifs: true, autoPlay: true },
    createdAt: now,
    audit: [],
  };
}
export function member(room: Room, actor: Actor) {
  requireRule(
    actor.role === "member",
    "FORBIDDEN",
    "Só quem está na sala pode fazer isso.",
    403,
  );
  const p = room.people.find((p) => p.id === actor.id);
  requireRule(
    p && p.status !== "REMOVED",
    "FORBIDDEN",
    "Sessão removida.",
    403,
  );
  return p;
}
export function authorize(room: Room, actor: Actor) {
  if (actor.role === "stage")
    requireRule(
      actor.epoch === room.epoch,
      "STALE_PLAYBACK_EPOCH",
      "Esta TV foi trocada por outra. Use a TV mais recente ou ligue esta de novo.",
      403,
    );
  else member(room, actor);
}
export function eligibleSong(room: Room, id: string, now: number) {
  return room.songs.find(
    (s) =>
      s.id === id &&
      s.status === "WAITING" &&
      room.people.some((p) => p.id === s.personId && active(p, now)),
  );
}
// A votação abre nos últimos 20s da música (avisado pelo palco) e fecha 10s
// depois do fim do vídeo.
export const VOTE_EARLY_MS = 20000;
export const VOTE_AFTER_MS = 10000;
// Quando todos já votaram, ainda dá alguns segundos para trocar a nota.
export const ALL_VOTED_GRACE_MS = 3000;
function allVoted(r: Round) {
  return r.eligible.every((id) => r.votes[id] !== undefined);
}
function closeWhenAllVoted(room: Room, now: number) {
  const r = room.current?.round;
  if (!r || room.state !== "VOTING" || r.closedAt !== undefined) return;
  if (!r.eligible.length) return finishVoting(room, now, "ALL_VOTED");
  if (allVoted(r))
    r.deadline = Math.min(r.deadline ?? Infinity, now + ALL_VOTED_GRACE_MS);
}
const EARLY_VOTING_STATES = ["PLAYING", "PAUSED"];
export function votingOpen(room: Room, now: number) {
  const r = room.current?.round;
  if (!r || r.closedAt !== undefined) return false;
  if (room.state === "VOTING")
    return r.deadline !== undefined && now < r.deadline;
  return EARLY_VOTING_STATES.includes(room.state) && r.deadline === undefined;
}
function connectedVoters(room: Room, singerId: string, now: number) {
  return room.people
    .filter(
      (x) => active(x, now) && x.id !== singerId && now - x.lastSeen < 15000,
    )
    .map((x) => x.id);
}
export function canVote(room: Room, personId: string, now: number) {
  const r = room.current?.round;
  if (!r || !votingOpen(room, now)) return false;
  if (r.eligible.includes(personId)) return true;
  // Na reta final, quem desbloqueia o celular depois da abertura também vota.
  const person = room.people.find((p) => p.id === personId);
  return (
    room.state !== "VOTING" &&
    !!person &&
    active(person, now) &&
    personId !== room.current!.singerId
  );
}
export function finishVoting(room: Room, now: number, reason = "DEADLINE") {
  const r = room.current?.round;
  if (!r || r.closedAt !== undefined) return;
  r.closedAt = now;
  r.reason = reason;
  const votes = Object.values(r.votes);
  r.count = votes.length;
  r.sum = votes.reduce((a, b) => a + b, 0);
  r.average = r.count ? r.sum / r.count : null;
  room.state = "RESULTS";
  room.current!.outcome = "COMPLETED";
  room.current!.endedAt = now;
  const song = room.songs.find((s) => s.id === room.current!.songId)!;
  song.status = "COMPLETED";
  if (
    reason !== "ROOM_CLOSED" &&
    r.count >= 2 &&
    r.sum === 10 * r.count &&
    !encoreOnCooldown(room, room.current!.singerId)
  ) {
    const target = room.songs
      .filter(
        (s) =>
          s.personId === room.current!.singerId &&
          eligibleSong(room, s.id, now),
      )
      .sort((a, b) => a.seq - b.seq)[0];
    if (target)
      room.offer = {
        personId: target.personId,
        songId: target.id,
        state: "OFFERED",
      };
  }
}
export function maintain(room: Room, now: number) {
  if (
    room.state === "RESULTS" &&
    room.offer?.state === "OFFERED" &&
    now - (room.current?.round?.closedAt || 0) >= 10000
  )
    room.offer.state = "EXPIRED";
  if (
    room.state === "VOTING" &&
    room.current?.round?.deadline !== undefined &&
    now >= room.current.round.deadline
  )
    finishVoting(
      room,
      now,
      allVoted(room.current.round) ? "ALL_VOTED" : "DEADLINE",
    );
  if (
    room.offer &&
    ["OFFERED", "ACCEPTED"].includes(room.offer.state) &&
    (!eligibleSong(room, room.offer.songId, now) ||
      encoreOnCooldown(room, room.offer.personId))
  )
    room.offer.state = "CANCELLED";
  if (
    ["PREPARING", "PLAYING", "PAUSED"].includes(room.state) &&
    now - room.stageSeen >= 15000
  ) {
    room.recoveryFrom = room.state;
    room.state = "RECOVERY";
  }
  if (
    room.state === "PREPARING" &&
    room.current &&
    !room.people.some((p) => p.id === room.current!.singerId && active(p, now))
  )
    cancel(room, now, true);
  if (
    room.state !== "CLOSED" &&
    now -
      Math.max(
        room.createdAt,
        room.stageSeen,
        ...room.people.map((p) => p.lastSeen),
      ) >=
      7200000
  ) {
    if (room.state === "VOTING") finishVoting(room, now, "ROOM_CLOSED");
    room.state = "CLOSED";
    room.closedAt = now;
  }
}
function archive(room: Room) {
  if (room.current) {
    room.history.push(structuredClone(room.current));
    room.current = undefined;
  }
}
function cancel(room: Room, now: number, technical: boolean) {
  const p = room.current;
  requireRule(
    p && ["PREPARING", "PLAYING", "PAUSED", "RECOVERY"].includes(room.state),
    "INVALID_STATE",
    "Nenhuma apresentação para cancelar.",
    409,
  );
  if (technical && p.turnApplied && !p.turnReverted) {
    const singer = room.people.find((x) => x.id === p.singerId)!;
    singer.turns = Math.max(0, singer.turns - 1);
    p.turnReverted = true;
  }
  // Votos antecipados não valem para apresentação interrompida.
  if (p.round && p.round.closedAt === undefined) p.round = undefined;
  p.outcome = technical ? "FAILED" : "SKIPPED";
  p.endedAt = now;
  room.songs.find((s) => s.id === p.songId)!.status = technical
    ? "FAILED"
    : "SKIPPED";
  archive(room);
  room.state = "LOBBY";
  if (technical) room.settings.autoPlay = false;
}
export function canAutoPrepare(room: Room, now: number) {
  return (
    room.settings.autoPlay !== false &&
    ["LOBBY", "RESULTS"].includes(room.state) &&
    room.epoch > 0 &&
    now - room.stageSeen < 15000 &&
    (room.state !== "RESULTS" ||
      (now - (room.current?.round?.closedAt || 0) >= 5000 &&
        (room.offer?.state !== "OFFERED" ||
          now - (room.current?.round?.closedAt || 0) >= 10000))) &&
    forecast(room, now).length > 0
  );
}
export function apply(
  room: Room,
  actor: Actor,
  cmd: Command,
  now: number,
  video?: Video,
) {
  authorize(room, actor);
  requireRule(
    room.state !== "CLOSED",
    "ROOM_CLOSED",
    "A sala está encerrada.",
    409,
  );
  const host = () =>
    requireRule(
      actor.role === "member" && room.hostId === actor.id,
      "HOST_ONLY",
      "Apenas o anfitrião pode fazer isso.",
      403,
    );
  const payload = cmd.payload;
  const me = actor.role === "member" ? member(room, actor) : undefined;
  const string = (key: string) => {
    requireRule(
      typeof payload[key] === "string",
      "INVALID_PAYLOAD",
      `Campo inválido: ${key}`,
      400,
    );
    return payload[key] as string;
  };
  if (me && !["LEAVE"].includes(cmd.kind)) {
    requireRule(
      me.status === "ACTIVE",
      "LEFT",
      "Entre novamente para participar.",
      403,
    );
    me.lastSeen = now;
  }
  switch (cmd.kind) {
    case "ADD": {
      requireRule(
        me && video,
        "VIDEO_UNAVAILABLE",
        "Não conseguimos usar esse vídeo. Escolha outra versão da música.",
      );
      requireRule(
        room.songs.filter(
          (s) =>
            s.personId === me.id &&
            ["WAITING", "RESERVED", "PLAYING"].includes(s.status),
        ).length < 5 &&
          room.songs.filter((s) => s.status === "WAITING").length < 100,
        "QUEUE_LIMIT",
        "A fila já está cheia. Cada pessoa pode ter até 5 músicas esperando.",
      );
      requireRule(
        !room.songs.some(
          (s) =>
            s.personId === me.id &&
            s.video.id === video.id &&
            ["WAITING", "RESERVED", "PLAYING"].includes(s.status),
        ),
        "DUPLICATE_SONG",
        "Esta música já está na sua fila.",
      );
      room.songs.push({
        id: randomUUID(),
        personId: me.id,
        video,
        seq: room.nextSeq++,
        status: "WAITING",
      });
      break;
    }
    case "REMOVE_SONG": {
      const s = room.songs.find((s) => s.id === string("songId"));
      requireRule(
        s && s.status === "WAITING",
        "INVALID_SONG",
        "Essa música não está mais esperando na fila.",
      );
      requireRule(
        me && (s.personId === me.id || me.id === room.hostId),
        "FORBIDDEN",
        "Você não pode remover esta música.",
        403,
      );
      s.status = "CANCELLED";
      break;
    }
    case "PREPARE": {
      host();
      requireRule(
        room.state === "LOBBY" || room.state === "RESULTS",
        "INVALID_STATE",
        "Termine a apresentação atual primeiro.",
        409,
      );
      if (room.state === "RESULTS")
        requireRule(
          now - (room.current?.round?.closedAt || 0) >= 5000,
          "RESULT_DELAY",
          "Deixe o resultado na tela por pelo menos cinco segundos.",
          409,
        );
      requireRule(
        room.epoch > 0 && now - room.stageSeen < 15000,
        "STAGE_OFFLINE",
        "Ligue a TV antes de começar: toque em Ligar a TV.",
      );
      const s = forecast(room, now)[0];
      requireRule(s, "QUEUE_EMPTY", "Não tem música pronta pra tocar na fila.");
      archive(room);
      const isEncore =
        room.offer?.state === "ACCEPTED" &&
        room.offer.songId === s.id &&
        !encoreOnCooldown(room, room.offer.personId);
      if (room.offer) room.offer.state = isEncore ? "CONSUMED" : "EXPIRED";
      s.status = "RESERVED";
      room.current = {
        id: randomUUID(),
        songId: s.id,
        singerId: s.personId,
        epoch: room.epoch,
        lastReport: 0,
        turnApplied: false,
        turnReverted: false,
        isEncore,
      };
      room.state = "PREPARING";
      break;
    }
    case "START":
    case "RESUME": {
      host();
      requireRule(
        ["PREPARING", "PAUSED", "RECOVERY"].includes(room.state),
        "INVALID_STATE",
        "Não é possível iniciar agora.",
        409,
      );
      requireRule(
        now - room.stageSeen < 15000,
        "STAGE_OFFLINE",
        "A TV está desligada ou sem internet. Abra o site nela de novo.",
      );
      if (room.state === "RECOVERY") {
        room.state = room.current?.turnApplied ? "PAUSED" : "PREPARING";
      }
      break;
    }
    case "PAUSE":
      host();
      requireRule(
        room.state === "PLAYING",
        "INVALID_STATE",
        "Não está tocando.",
        409,
      );
      room.state = "PAUSED";
      break;
    case "SKIP":
      host();
      cancel(room, now, false);
      break;
    case "TECHNICAL_CANCEL":
      host();
      cancel(room, now, true);
      break;
    case "REPORT": {
      requireRule(
        actor.role === "stage",
        "STAGE_ONLY",
        "Somente o palco confirma reprodução.",
        403,
      );
      const p = room.current;
      requireRule(
        p && p.id === string("performanceId") && actor.epoch === p.epoch,
        "STALE_PLAYBACK_EPOCH",
        "Esta TV foi trocada por outra. Use a TV mais recente ou ligue esta de novo.",
        409,
      );
      requireRule(
        Number.isInteger(payload.seq) && (payload.seq as number) > p.lastReport,
        "STALE_REPORT",
        "Relato antigo.",
        409,
      );
      p.lastReport = payload.seq as number;
      room.stageSeen = now;
      const event = string("event");
      if (event === "PLAYING" && ["PREPARING", "PAUSED"].includes(room.state)) {
        if (!p.turnApplied) {
          p.turnApplied = true;
          p.startedAt = now;
          room.people.find((x) => x.id === p.singerId)!.turns++;
        }
        room.state = "PLAYING";
        room.songs.find((s) => s.id === p.songId)!.status = "PLAYING";
      } else if (event === "PAUSED" && room.state === "PLAYING")
        room.state = "PAUSED";
      else if (
        event === "ERROR" &&
        ["PREPARING", "PLAYING", "PAUSED"].includes(room.state)
      ) {
        room.recoveryFrom = room.state;
        room.state = "RECOVERY";
      } else if (
        event === "FINALE" &&
        EARLY_VOTING_STATES.includes(room.state) &&
        !p.round
      ) {
        p.round = {
          eligible: connectedVoters(room, p.singerId, now),
          votes: {},
          openedAt: now,
        };
      } else if (event === "ENDED" && room.state === "PLAYING") {
        room.state = "VOTING";
        const early = p.round;
        p.round = {
          eligible: [
            ...new Set([
              ...(early?.eligible || []),
              ...connectedVoters(room, p.singerId, now),
            ]),
          ],
          votes: early?.votes || {},
          openedAt: early?.openedAt ?? now,
          deadline: now + VOTE_AFTER_MS,
        };
        closeWhenAllVoted(room, now);
      }
      break;
    }
    case "VOTE": {
      requireRule(me, "FORBIDDEN", "Somente participantes votam.", 403);
      const r = room.current?.round;
      requireRule(
        r && votingOpen(room, now),
        "VOTING_CLOSED",
        room.state === "VOTING"
          ? "A votação já terminou."
          : "A votação ainda não está aberta.",
        409,
      );
      requireRule(
        room.current!.singerId !== me.id,
        "SELF_VOTE",
        "Você não pode votar em si.",
      );
      requireRule(
        canVote(room, me.id, now),
        "NOT_ELIGIBLE",
        "Você não participa desta rodada porque entrou depois que ela começou. Vote na próxima música!",
        403,
      );
      requireRule(
        Number.isInteger(payload.score) &&
          (payload.score as number) >= 0 &&
          (payload.score as number) <= 10,
        "INVALID_SCORE",
        "Escolha uma nota inteira de 0 a 10.",
      );
      if (!r.eligible.includes(me.id)) r.eligible.push(me.id);
      // Votar de novo troca a nota: cada pessoa conta uma vez só.
      r.votes[me.id] = payload.score as number;
      closeWhenAllVoted(room, now);
      break;
    }
    case "ENCORE": {
      requireRule(
        me && !encoreOnCooldown(room, me.id),
        "ENCORE_COOLDOWN",
        "Depois de um bis, você só ganha outro quando mais quatro músicas terminarem.",
      );
      requireRule(
        me && room.state === "RESULTS" && room.offer?.personId === me.id,
        "NO_OFFER",
        "Você não tem uma oferta de bis.",
      );
      requireRule(
        typeof payload.accept === "boolean",
        "INVALID_PAYLOAD",
        "Decisão inválida.",
        400,
      );
      if (room.offer.state === "OFFERED")
        room.offer.state = payload.accept ? "ACCEPTED" : "DECLINED";
      else
        requireRule(
          room.offer.state === (payload.accept ? "ACCEPTED" : "DECLINED"),
          "OFFER_EXPIRED",
          "Esse bis já foi decidido.",
        );
      break;
    }
    case "TRANSFER": {
      host();
      const target = room.people.find((p) => p.id === string("personId"));
      requireRule(
        target && active(target, now) && now - target.lastSeen < 15000,
        "PERSON_OFFLINE",
        "Essa pessoa está com o celular desconectado. Escolha alguém que esteja com a sala aberta.",
      );
      room.hostId = target.id;
      break;
    }
    case "REMOVE_PERSON": {
      host();
      const target = room.people.find((p) => p.id === string("personId"));
      requireRule(
        target && target.id !== room.hostId,
        "INVALID_PERSON",
        "Não é possível remover o anfitrião.",
      );
      target.status = "REMOVED";
      if (room.state === "PREPARING" && room.current?.singerId === target.id)
        cancel(room, now, true);
      const r = room.current?.round;
      if (r && r.closedAt === undefined) {
        r.eligible = r.eligible.filter((id) => id !== target.id);
        delete r.votes[target.id];
        closeWhenAllVoted(room, now);
      }
      break;
    }
    case "SETTINGS":
      host();
      if (payload.gifDisplay !== undefined)
        requireRule(
          payload.gifDisplay === "normal" ||
            payload.gifDisplay === "expanded" ||
            payload.gifDisplay === "minimized",
          "INVALID_SETTING",
          "Escolha um tamanho válido para o GIF.",
          400,
        );
      if (payload.scoreSound !== undefined)
        requireRule(
          typeof payload.scoreSound === "boolean",
          "INVALID_SETTING",
          "A configuração de som deve ser ligada ou desligada.",
          400,
        );
      for (const key of [
        "entry",
        "reactions",
        "gifs",
        "autoPlay",
        "scoreSound",
      ] as const)
        if (typeof payload[key] === "boolean")
          room.settings[key] = payload[key];
      if (payload.gifDisplay !== undefined)
        room.settings.gifDisplay = payload.gifDisplay;
      if (payload.autoPlay === true) room.autoPlayError = undefined;
      break;
    case "LEAVE":
      requireRule(
        me && me.id !== room.hostId,
        "HOST_MUST_TRANSFER",
        "Antes de sair, transfira o comando da sala para outra pessoa em Gerenciar, ou encerre a sala.",
      );
      me.status = "LEFT";
      if (room.state === "PREPARING" && room.current?.singerId === me.id)
        cancel(room, now, true);
      break;
    case "CLOSE":
      host();
      if (room.state === "VOTING") finishVoting(room, now, "ROOM_CLOSED");
      room.state = "CLOSED";
      room.closedAt = now;
      if (room.offer) room.offer.state = "EXPIRED";
      break;
    default:
      throw new RuleError(
        "INVALID_COMMAND",
        "Algo deu errado. Atualize a página e tente de novo.",
        400,
      );
  }
  maintain(room, now);
  if (
    ["TRANSFER", "REMOVE_PERSON", "TECHNICAL_CANCEL", "CLOSE"].includes(
      cmd.kind,
    )
  )
    room.audit.push({
      at: now,
      actor: actor.id,
      action: cmd.kind,
      target:
        typeof payload.personId === "string" ? payload.personId : undefined,
    });
}
export function project(room: Room, actor: Actor, now: number, mode: string) {
  authorize(room, actor);
  const { audit, ...publicRoom } = structuredClone(room);
  const clean = (p: Performance) => {
    const { round, ...rest } = p;
    if (!round) return rest;
    const { votes, eligible, ...r } = round;
    return {
      ...rest,
      round: {
        ...r,
        received: Object.keys(votes).length,
        eligibleCount: eligible.length,
      },
    };
  };
  const r = room.current?.round;
  return {
    ...publicRoom,
    current: room.current ? clean(room.current) : undefined,
    history: room.history.map(clean),
    queue: forecast(room, now),
    me: actor,
    myVote: actor.role === "member" ? r?.votes[actor.id] : undefined,
    canVote: actor.role === "member" && canVote(room, actor.id, now),
    serverTime: now,
    integrationMode: mode,
  };
}
