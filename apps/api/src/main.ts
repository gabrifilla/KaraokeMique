import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Param,
  Query,
  Body,
  Module,
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { Server } from "socket.io";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { randomUUID, randomBytes } from "node:crypto";
import { Store, hash, secret, replaceStage } from "./store.js";
import {
  createTvPairing,
  approveTvPairing,
  redeemTvPairing,
} from "./tv-pairing.js";
import { allowsDevelopmentPairing, resolvePairing } from "./pairing.js";
import { prepareAutomatically } from "./auto-queue.js";
import { deploymentOrigin, trustProxy } from "./deployment.js";
import { serveFrontend } from "./frontend.js";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { mode, search, suggestions, validateVideo } from "./youtube.js";
import {
  createRoom,
  apply,
  authorize,
  requireRule,
  RuleError,
  project,
  forecast,
  finishVoting,
} from "../../../packages/domain/src/index.js";
import {
  commandSchema,
  nickname,
} from "../../../packages/contracts/src/index.js";
import type {
  Actor,
  Room,
  Command,
} from "../../../packages/contracts/src/index.js";
const origin = deploymentOrigin(process.env, mode);
const store = new Store();
await store.init();
requireRule(
  ["real", "demo"].includes(mode),
  "CONFIG",
  "INTEGRATION_MODE inválido.",
);
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: origin.startsWith("https://"),
  path: "/",
  maxAge: 86400000,
};
const cookieName = (id: string, stage = false) =>
  `k_${stage ? "stage" : "member"}_${id}`;
const roomId = (id: string) => z.uuid().parse(id);
async function identity(req: Request, id: string, stage = false) {
  return store.session(req.cookies[cookieName(id, stage)], id);
}
function setSession(res: Response, id: string, token: string, stage = false) {
  res.cookie(cookieName(id, stage), token, cookieOptions);
}
const buckets = new Map<string, { n: number; until: number }>();
function limit(key: string, max: number, ms: number) {
  const now = Date.now();
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.until <= now) {
    buckets.set(key, { n: 1, until: now + ms });
    return;
  }
  requireRule(
    b.n++ < max,
    "RATE_LIMIT",
    "Aguarde antes de tentar novamente.",
    429,
  );
}
@Catch()
class Errors implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const id = randomUUID();
    const status =
      e instanceof RuleError
        ? e.status
        : e instanceof ZodError
          ? 400
          : e instanceof HttpException
            ? e.getStatus()
            : 503;
    if (status === 503)
      console.error(
        JSON.stringify({
          requestId: id,
          path: req.path,
          error: e instanceof RuleError ? e.code : "INTERNAL_ERROR",
        }),
      );
    res.status(status).json({
      error: {
        code:
          e instanceof RuleError
            ? e.code
            : e instanceof ZodError
              ? "INVALID_PAYLOAD"
              : status === 404
                ? "NOT_FOUND"
                : status < 500
                  ? "INVALID_REQUEST"
                  : "SERVICE_UNAVAILABLE",
        message:
          e instanceof RuleError
            ? e.message
            : e instanceof ZodError
              ? "Dados inválidos. Verifique os campos."
              : status === 404
                ? "Recurso não encontrado."
                : status < 500
                  ? "Requisição inválida."
                  : "Serviço indisponível. Tente novamente.",
        retryable: status === 503,
        requestId: id,
      },
      serverTime: Date.now(),
    });
  }
}
@Controller("api/v1")
class Api {
  @Get("health") async health() {
    await store.pool.query("SELECT 1");
    return {
      status: "ok",
      mode,
      developmentPairing: allowsDevelopmentPairing(process.env.NODE_ENV),
    };
  }
  @Get("csrf") csrf(@Res({ passthrough: true }) res: Response) {
    const token = secret();
    res.cookie("k_csrf", token, { ...cookieOptions, httpOnly: false });
    return { token };
  }
  @Get("hosted-rooms") async hosted(@Req() req: Request) {
    const tokens = Object.entries(req.cookies)
      .filter(
        ([key, value]) =>
          key.startsWith("k_member_") && typeof value === "string",
      )
      .slice(0, 50)
      .map(([, value]) => hash(value as string));
    const result = await store.pool.query(
      "SELECT DISTINCT r.id,r.code,r.data->>'name' AS name FROM rooms r JOIN sessions s ON s.room_id=r.id WHERE s.token_hash=ANY($1::text[]) AND s.expires_at>now() AND s.actor->>'role'='member' AND s.actor->>'id'=r.data->>'hostId' AND r.data->>'state'<>'CLOSED'",
      [tokens],
    );
    return result.rows;
  }
  @Post("tv-pairing") async createTv(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    limit(`tv-create:${req.ip}`, 10, 600000);
    const { deviceToken, ...pairing } = await createTvPairing(store);
    res.cookie(`k_tv_${pairing.id}`, deviceToken, {
      ...cookieOptions,
      maxAge: 300000,
    });
    return pairing;
  }
  @Post("tv-pairing/status") async tvStatus(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { id } = z.object({ id: z.uuid() }).parse(body);
    limit(`tv-status:${id}`, 60, 60000);
    const device = req.cookies[`k_tv_${id}`];
    requireRule(
      typeof device === "string",
      "UNAUTHORIZED",
      "Gere o código nesta TV para conectar.",
      401,
    );
    const result = await redeemTvPairing(store, id, device);
    if (result.state === "PAIRED") {
      if (result.token) setSession(res, result.roomId, result.token, true);
      else await identity(req, result.roomId, true);
    }
    return {
      state: result.state,
      ...(result.state === "PAIRED" ? { roomId: result.roomId } : {}),
    };
  }
  @Post("rooms/:id/connect-tv") async approveTv(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    roomId(id);
    limit(`tv-approve:${req.ip}`, 20, 60000);
    const { code } = z
      .object({ code: z.string().regex(/^\d{6}$/) })
      .parse(body);
    await approveTvPairing(store, id, await identity(req, id), code);
    return { accepted: true };
  }
  @Get("invites/:code") async invite(@Param("code") code: string) {
    z.string()
      .regex(/^[A-F0-9]{8}$/)
      .parse(code);
    const r = await store.pool.query("SELECT data FROM rooms WHERE code=$1", [
      code,
    ]);
    requireRule(r.rowCount, "NOT_FOUND", "Convite não encontrado.", 404);
    const room = r.rows[0].data as Room;
    return {
      name: room.name,
      open: room.settings.entry && room.state !== "CLOSED",
      code,
    };
  }
  @Post("rooms") async create(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    limit(`create:${req.ip}`, 5, 3600000);
    const b = z
      .object({
        name: z.string().trim().max(60).default(""),
        nickname,
        avatar: z.enum(["🎤", "🌟", "🎸", "🪩", "🎧"]).default("🎤"),
      })
      .parse(body);
    const room = createRoom(b.name, b.nickname, b.avatar, Date.now());
    const token = await store.create(room);
    setSession(res, room.id, token);
    return { roomId: room.id };
  }
  @Post("rooms/join") async join(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    limit(`join:${req.ip}`, 20, 60000);
    const b = z
      .object({
        code: z.string().regex(/^[A-F0-9]{8}$/),
        nickname,
        avatar: z.enum(["🎤", "🌟", "🎸", "🪩", "🎧"]).default("🌟"),
      })
      .parse(body);
    const r = await store.pool.query("SELECT id FROM rooms WHERE code=$1", [
      b.code,
    ]);
    requireRule(r.rowCount, "NOT_FOUND", "Convite não encontrado.", 404);
    const id = r.rows[0].id;
    let existing: Actor | undefined;
    try {
      existing = await identity(req, id);
    } catch (e) {
      if (e instanceof RuleError && e.code !== "UNAUTHORIZED") throw e;
    }
    const token = secret();
    await store.mutate(id, async (room, c) => {
      requireRule(
        room.state !== "CLOSED",
        "ROOM_CLOSED",
        "Sala encerrada.",
        409,
      );
      if (existing) {
        const p = room.people.find((p) => p.id === existing!.id)!;
        p.status = "ACTIVE";
        p.lastSeen = Date.now();
        return {};
      }
      requireRule(
        room.settings.entry,
        "ENTRY_CLOSED",
        "O anfitrião fechou as entradas.",
        403,
      );
      requireRule(
        room.people.filter((p) => p.status === "ACTIVE").length < 30,
        "ROOM_FULL",
        "Sala cheia.",
      );
      const person = {
        id: randomUUID(),
        name: b.nickname,
        avatar: b.avatar,
        status: "ACTIVE" as const,
        turns: 0,
        lastSeen: Date.now(),
      };
      room.people.push(person);
      await c.query(
        "INSERT INTO sessions(token_hash,room_id,actor) VALUES($1,$2,$3)",
        [hash(token), id, { id: person.id, role: "member" }],
      );
      return {};
    });
    if (!existing) setSession(res, id, token);
    return { roomId: id };
  }
  @Get("rooms/:id/snapshot") async snapshot(
    @Param("id") id: string,
    @Req() req: Request,
    @Query("stage") stage?: string,
  ) {
    roomId(id);
    const actor = await identity(req, id, stage === "1");
    return project(await store.read(id), actor, Date.now(), mode);
  }
  @Get("rooms/:id/music/search") async music(
    @Param("id") id: string,
    @Req() req: Request,
    @Query("q") q = "",
    @Query("cursor") cursor = "",
  ) {
    roomId(id);
    const a = await identity(req, id);
    requireRule(
      a.role === "member",
      "FORBIDDEN",
      "Somente participantes.",
      403,
    );
    limit(`search:${a.id}`, 6, 60000);
    return search(q, cursor);
  }
  @Get("rooms/:id/music/suggestions") async suggestedMusic(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    roomId(id);
    const actor = await identity(req, id);
    requireRule(
      actor.role === "member",
      "FORBIDDEN",
      "Somente participantes.",
      403,
    );
    limit(`suggestions:${actor.id}`, 12, 60000);
    return suggestions();
  }
  @Post("rooms/:id/commands") async command(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Query("stage") stage?: string,
  ) {
    roomId(id);
    const cmd = commandSchema.parse(body);
    const a = await identity(req, id, stage === "1");
    const token = req.cookies[cookieName(id, stage === "1")];
    limit(`command:${a.id}`, 120, 60000);
    const prior = await store.receipt(
      token,
      cmd.commandId,
      JSON.stringify(cmd),
    );
    if (prior)
      return {
        ...prior,
        snapshot: project(await store.read(id), a, Date.now(), mode),
      };
    if (cmd.kind === "PAIR") {
      const code = randomBytes(12).toString("hex").toUpperCase();
      return store.mutate(
        id,
        async (room, c) => {
          authorize(room, a);
          requireRule(
            a.role === "member" && room.hostId === a.id,
            "HOST_ONLY",
            "Apenas o anfitrião pode parear.",
            403,
          );
          requireRule(
            room.state !== "CLOSED",
            "ROOM_CLOSED",
            "Sala encerrada.",
            409,
          );
          await c.query(
            "INSERT INTO pairings VALUES($1,$2,now()+interval '2 minutes',false)",
            [hash(code), id],
          );
          return { code };
        },
        { token, id: cmd.commandId, body: JSON.stringify(cmd) },
      );
    }
    const video =
      cmd.kind === "ADD"
        ? await validateVideo(z.string().parse(cmd.payload.videoId))
        : undefined;
    let preparedId: string | undefined;
    if (cmd.kind === "PREPARE") {
      const r = await store.read(id);
      const next = forecast(r, Date.now())[0];
      if (next) {
        await validateVideo(next.video.id);
        preparedId = next.id;
      }
    }
    const result = await store.mutate(
      id,
      (room) => {
        if (cmd.kind === "PREPARE")
          requireRule(
            forecast(room, Date.now())[0]?.id === preparedId,
            "VERSION_CONFLICT",
            "A fila mudou. Prepare novamente.",
            409,
          );
        const wasPlaying = room.state === "PLAYING";
        apply(room, a, cmd, Date.now(), video);
        if (
          cmd.kind === "REPORT" &&
          wasPlaying &&
          room.state === "VOTING" &&
          room.current?.round
        ) {
          const connected = new Set(
            [...io.sockets.sockets.values()]
              .filter((s) => s.data.id === id && s.data.actor.role === "member")
              .map((s) => s.data.actor.id),
          );
          room.current.round.eligible = room.current.round.eligible.filter(
            (id) => connected.has(id),
          );
          if (!room.current.round.eligible.length)
            finishVoting(room, Date.now(), "ALL_VOTED");
        }
        return { accepted: true };
      },
      { token, id: cmd.commandId, body: JSON.stringify(cmd) },
    );
    if (["START", "RESUME", "PAUSE"].includes(cmd.kind)) {
      const r = await store.read(id);
      io.to(`stage:${id}:${r.epoch}`).emit("playback.command", {
        action: cmd.kind,
        performanceId: r.current?.id,
        epoch: r.epoch,
        commandId: cmd.commandId,
      });
    }
    return {
      ...result,
      snapshot: project(await store.read(id), a, Date.now(), mode),
    };
  }
  @Post("pairing/redeem") async redeem(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    limit(`pair:${req.ip}`, 20, 60000);
    const { roomId: id, codeHash } = await resolvePairing(
      store.pool,
      body,
      process.env.NODE_ENV,
    );
    const token = secret();
    await store.mutate(id, async (room, c) => {
      requireRule(
        room.state !== "CLOSED",
        "ROOM_CLOSED",
        "Sala encerrada.",
        409,
      );
      if (codeHash) {
        const r = await c.query(
          "UPDATE pairings SET consumed=true WHERE code_hash=$1 AND consumed=false AND expires_at>now() RETURNING room_id",
          [codeHash],
        );
        requireRule(
          r.rowCount,
          "PAIR_EXPIRED",
          "Código expirado ou já utilizado.",
          409,
        );
      }
      await replaceStage(room, c, token);
      return {};
    });
    setSession(res, id, token, true);
    return { roomId: id };
  }
}
@Module({ controllers: [Api] })
class AppModule {}
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  logger: ["error", "warn"],
});
// Behind a tunnel/reverse proxy, every client would otherwise share the proxy's IP in rate limits.
app.set("trust proxy", trustProxy(process.env));
app.use(
  helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: origin.startsWith("https://") ? undefined : false,
  }),
);
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use((req: Request, res: Response, next: () => void) => {
  if (
    req.method === "POST" &&
    (req.headers.origin !== origin ||
      !req.cookies.k_csrf ||
      req.headers["x-csrf-token"] !== req.cookies.k_csrf)
  ) {
    res.status(403).json({
      error: { code: "CSRF", message: "Atualize a página para continuar." },
    });
    return;
  }
  next();
});
if (process.env.SERVE_WEB === "true") serveFrontend(app, origin);
app.useGlobalFilters(new Errors());
const io = new Server(app.getHttpServer(), {
  cors: { origin, credentials: true },
  pingInterval: 5000,
  pingTimeout: 5000,
  maxHttpBufferSize: 16384,
  allowRequest: (req, callback) =>
    callback(null, req.headers.origin === origin),
});
const parseCookies = (raw = "") =>
  Object.fromEntries(raw.split(";").map((s) => s.trim().split("=")));
io.use(async (socket, next) => {
  try {
    const id = roomId(socket.handshake.auth.roomId);
    const stage = socket.handshake.auth.stage === true;
    const token = parseCookies(socket.request.headers.cookie)[
      cookieName(id, stage)
    ];
    const actor = await store.session(token, id);
    socket.data = { id, token, actor };
    next();
  } catch {
    next(new Error("Sessão inválida. Entre novamente."));
  }
});
async function syncSocket(socket: any) {
  const { id, token } = socket.data;
  const a = await store.session(token, id);
  const r = await store.read(id);
  socket.emit("room.state", project(r, a, Date.now(), mode));
  return r;
}
io.on("connection", (socket) => {
  const { id, actor } = socket.data as { id: string; actor: Actor };
  socket.join(`room:${id}`);
  if (actor.role === "stage") socket.join(`stage:${id}:${actor.epoch}`);
  const heartbeat = async (ack?: (v: unknown) => void) => {
    try {
      const a = await store.session(socket.data.token, id);
      await store.mutate(id, async (room, c) => {
        authorize(room, a);
        if (a.role === "stage") room.stageSeen = Date.now();
        else {
          const p = room.people.find((p) => p.id === a.id)!;
          requireRule(p.status === "ACTIVE", "LEFT", "Você saiu da sala.", 403);
          p.lastSeen = Date.now();
        }
        await c.query(
          "UPDATE sessions SET expires_at=now()+interval '24 hours' WHERE token_hash=$1",
          [hash(socket.data.token)],
        );
        return {};
      });
      await syncSocket(socket);
      ack?.({ ok: true });
    } catch {
      socket.disconnect(true);
    }
  };
  void heartbeat();
  socket.on("presence.heartbeat", heartbeat);
  socket.on(
    "session.sync",
    () => void syncSocket(socket).catch(() => socket.disconnect(true)),
  );
  socket.on("reaction.send", async (raw, ack = () => {}) => {
    try {
      const a = await store.session(socket.data.token, id);
      const r = await store.read(id);
      requireRule(
        a.role === "member" && r.state !== "CLOSED" && r.settings.reactions,
        "REACTIONS_OFF",
        "Reações desativadas.",
        403,
      );
      const b = z
        .discriminatedUnion("type", [
          z.object({
            type: z.literal("EMOJI"),
            value: z.enum(["👏", "🔥", "❤️", "🌟", "🎉", "🎤"]),
          }),
          z.object({
            type: z.literal("GIF"),
            value: z.string().regex(/^[A-Za-z0-9]{1,64}$/),
          }),
        ])
        .parse(raw);
      if (b.type === "GIF")
        requireRule(r.settings.gifs, "GIFS_OFF", "GIFs desativados.");
      limit(
        `reaction:${a.id}:${b.type}`,
        b.type === "GIF" ? 1 : 3,
        b.type === "GIF" ? 3000 : 1000,
      );
      io.to(`room:${id}`).emit("reaction.display", {
        ...b,
        id: randomUUID(),
        senderName: r.people.find((p) => p.id === a.id)?.name || "Participante",
        expiresAt: Date.now() + 5000,
      });
      ack({ ok: true });
    } catch (e) {
      ack({ error: e instanceof RuleError ? e.message : "Reação inválida." });
    }
  });
});
let publishing = false;
async function publish() {
  if (publishing) return;
  publishing = true;
  try {
    const rows = await store.pool.query(
      "SELECT * FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT 100",
    );
    const ids = new Set<string>(rows.rows.map((r) => r.room_id));
    for (const id of ids) {
      const sockets = await io.in(`room:${id}`).fetchSockets();
      for (const s of sockets) {
        try {
          await syncSocket(s);
        } catch {
          s.disconnect(true);
        }
      }
    }
    if (rows.rowCount)
      await store.pool.query(
        "UPDATE outbox SET published_at=now() WHERE id=ANY($1::bigint[])",
        [rows.rows.map((r) => r.id)],
      );
  } catch {
    console.error(JSON.stringify({ event: "outbox_error" }));
  } finally {
    publishing = false;
  }
}
let sweeping = false;
let advancing = false;
const advanceTimer = setInterval(() => {
  if (advancing) return;
  advancing = true;
  void (async () => {
    const rooms = await store.pool.query(
      "SELECT id FROM rooms WHERE data->>'state' IN ('LOBBY','RESULTS')",
    );
    for (const { id } of rooms.rows)
      await prepareAutomatically(store, id, validateVideo);
  })()
    .catch(() => console.error(JSON.stringify({ event: "auto_queue_error" })))
    .finally(() => {
      advancing = false;
    });
}, 1000);
const timer = setInterval(() => {
  void publish();
  if (!sweeping) {
    sweeping = true;
    void store
      .sweep()
      .catch(() =>
        console.error(JSON.stringify({ event: "maintenance_error" })),
      )
      .finally(() => (sweeping = false));
  }
}, 100);
for (const row of (
  await store.pool.query("SELECT id FROM rooms WHERE data->>'state'<>'CLOSED'")
).rows)
  await store.mutate(row.id, (room) => {
    room.stageSeen = 0;
    for (const person of room.people) person.lastSeen = Date.now() - 60001;
    if (["PREPARING", "PLAYING", "PAUSED"].includes(room.state)) {
      room.recoveryFrom = room.state;
      room.state = "RECOVERY";
    }
    return {};
  });
await store.sweep();
await app.listen(
  Number(process.env.PORT || 3001),
  process.env.LISTEN_ADDRESS || "0.0.0.0",
);
console.log(
  JSON.stringify({ event: "api_ready", mode, port: process.env.PORT || 3001 }),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    clearInterval(timer);
    clearInterval(advanceTimer);
    await io.close();
    await app.close();
    await store.pool.end();
    process.exit(0);
  });
