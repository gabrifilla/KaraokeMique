import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { api, commandId } from "./api";
import { Player } from "./Player";
import { ScoreResult } from "./ScoreResult";
import { useStageScoreAudio } from "./score-audio";
import { TvSetup, ApproveTv, StageSetup } from "./TvSetup";
import { GifPicker, giphy } from "./Gifs";
import type {
  Snapshot,
  Video,
  Command,
  PublicPerformance,
} from "../../../packages/contracts/src/index.js";
import { Icon } from "./Icons";
import { PartyPreview } from "./PartyPreview";
import { Tutorial } from "./Tutorial";
import { GuidedTour, tourSeen, tourSteps } from "./GuidedTour";
import {
  enablePush,
  pushStatus,
  registerServiceWorker,
  resumePush,
  type PushStatus,
} from "./push";
import { Brand, SiteLayout } from "./Branding";
import {
  EmojiRain,
  GifSpotlight,
  stageReaction,
  type StageReaction,
} from "./StageReactions";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./style.css";
import "./stage.css";
import "./score-result.css";
import "./approved.css";
import "./branding.css";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});
const stateNames: Record<string, string> = {
  LOBBY: "A festa vai começar",
  PREPARING: "Prepare o microfone",
  PLAYING: "É hora do show",
  PAUSED: "Uma pausa para respirar",
  VOTING: "O palco é de vocês. Vote!",
  RESULTS: "Aplausos para essa voz",
  RECOVERY: "Vamos recuperar o palco",
  CLOSED: "Foi bom demais!",
};
const avatars = ["🎤", "🌟", "🎸", "🪩", "🎧"];
// Letras grandes: preferência de cada celular, aplicada antes de desenhar.
const textSizeKey = "karaoke.textSize";
function readLargeText() {
  try {
    return localStorage.getItem(textSizeKey) === "large";
  } catch {
    return false;
  }
}
function applyLargeText(large: boolean) {
  if (large) document.documentElement.dataset.textSize = "large";
  else delete document.documentElement.dataset.textSize;
}
applyLargeText(readLargeText());
void registerServiceWorker();
function LargeTextToggle() {
  const [large, setLarge] = useState(readLargeText);
  return (
    <button
      type="button"
      className="quiet text-size-toggle"
      aria-pressed={large}
      aria-label="Letras grandes"
      title="Letras grandes"
      onClick={() => {
        const next = !large;
        setLarge(next);
        applyLargeText(next);
        try {
          localStorage.setItem(textSizeKey, next ? "large" : "normal");
        } catch {
          /* sem armazenamento: vale só nesta visita */
        }
      }}
    >
      <span aria-hidden="true">Aa</span>
    </button>
  );
}
function Confirm({
  label,
  onConfirm,
  children,
}: {
  label: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className="quiet">{label}</button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog">
          <AlertDialog.Title>{label}?</AlertDialog.Title>
          <AlertDialog.Description>{children}</AlertDialog.Description>
          <div className="actions">
            <AlertDialog.Cancel asChild>
              <button className="quiet">Voltar</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button onClick={onConfirm}>Confirmar</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
function Entrance() {
  const navigate = useNavigate();
  const { code: inviteCode } = useParams();
  const location = useLocation();
  const isNew = location.pathname === "/rooms/new";
  const isJoin = location.pathname.startsWith("/join");
  const fromTv = isNew && new URLSearchParams(location.search).has("tv");
  const [code, setCode] = useState(inviteCode || "");
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🎤");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const invite = useQuery({
    queryKey: ["invite", inviteCode],
    queryFn: () => api(`/invites/${inviteCode}`),
    enabled: !!inviteCode,
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api(
        isNew ? "/rooms" : "/rooms/join",
        isNew
          ? { name, nickname, avatar }
          : { code: code.toUpperCase(), nickname, avatar },
      );
      const tv = new URLSearchParams(location.search).get("tv");
      if (isNew && tv) {
        // Veio do QR da TV: liga a TV sozinho, sem passo extra.
        try {
          await api(`/rooms/${r.roomId}/connect-tv`, { code: tv });
          navigate(`/r/${r.roomId}?tv=ligada`);
        } catch {
          navigate(`/r/${r.roomId}/stage?tv=${encodeURIComponent(tv)}`);
        }
        return;
      }
      navigate(`/r/${r.roomId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="landing"
      data-view={isNew ? "create" : isJoin ? "join" : "home"}
    >
      <header className="landing-header">
        <Brand />
        <nav aria-label="Navegação inicial">
          <LargeTextToggle />
          {!isNew && !isJoin && (
            <a className="header-how" href="#como-funciona">
              Como funciona
            </a>
          )}
          <Link className="header-join" to={isJoin ? "/rooms/new" : "/join"}>
            {isJoin ? "Criar uma sala" : "Entrar com código"}
            <Icon name="arrow" />
          </Link>
        </nav>
      </header>
      <main className={isNew || isJoin ? "hero entry-layout" : "hero"}>
        <section className={isNew || isJoin ? "entry-intro" : "hero-content"}>
          <p className="hero-label">
            <Icon name="mic" />
            {isNew
              ? fromTv
                ? "SÓ FALTA SEU NOME. A TV LIGA SOZINHA."
                : "UMA SALA. TODO MUNDO JUNTO."
              : isJoin
                ? "SEU LUGAR NA FESTA TÁ GUARDADO."
                : "KARAOKÊ COM A SUA GALERA"}
          </p>
          <h1>
            {isNew ? (
              <>
                O palco tá pronto.
                <br />
                <em>Chama a galera.</em>
              </>
            ) : isJoin ? (
              <>
                A festa fica melhor
                <br />
                <em>com a sua voz.</em>
              </>
            ) : (
              <>
                A próxima música
                <br />é a <em>sua.</em>
              </>
            )}
          </h1>
          <p className="hero-copy">
            {isNew
              ? "Crie sua sala, conecte uma tela e compartilhe o QR code. Cada amigo escolhe suas músicas pelo celular."
              : isJoin
                ? "Entre com seu apelido, escolha uma música e prepare o seu show. A fila cuida para todo mundo cantar."
                : "Uma tela vira o palco. Seu celular vira o controle. Junte os amigos para cantar, dar notas e pedir bis."}
          </p>
          {!isNew && !isJoin ? (
            <>
              <div className="actions hero-actions">
                <Link className="button" to="/rooms/new">
                  Criar uma sala
                  <Icon name="arrow" />
                </Link>
                <Link className="button secondary" to="/join">
                  Tenho um código
                </Link>
                <Link className="button secondary" to="/stage/tv">
                  Usar como palco
                </Link>
              </div>
              <div className="hero-note">
                <span className="friend-dots" aria-hidden="true">
                  <i>M</i>
                  <i>J</i>
                  <i>R</i>
                  <i>+</i>
                </span>
                <p>
                  Sem instalar nada.
                  <br />
                  <strong>É só entrar e soltar a voz.</strong>
                </p>
              </div>
            </>
          ) : (
            <div className="entry-companion">
              <img
                src="/mascot/v3/welcome.webp"
                alt="Mascote microfone esperando a galera"
              />
              <div>
                <strong>Todo mundo tem sua vez.</strong>
                <p>
                  Escolha. Cante. Aplauda.
                  <br />E bora para a próxima!
                </p>
              </div>
            </div>
          )}
        </section>
        {isNew || isJoin ? (
          <section className="entry-panel">
            <form className="entry-form card" onSubmit={submit}>
              <h2>
                {isNew
                  ? "Vamos abrir o palco?"
                  : invite.data?.name || "Entre na festa"}
              </h2>
              {isJoin && (
                <label>
                  Código da sala
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    minLength={8}
                    maxLength={8}
                    autoCapitalize="characters"
                  />
                </label>
              )}
              {isNew && (
                <label>
                  Nome da sala
                  <input
                    placeholder="Sábado lá em casa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                  />
                </label>
              )}
              <label>
                Como a galera te chama?
                <input
                  placeholder="Seu apelido"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  minLength={2}
                  maxLength={24}
                  autoComplete="nickname"
                />
              </label>
              <div className="avatar-row" aria-label="Escolha seu avatar">
                {avatars.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-label={`Avatar ${a}`}
                    aria-pressed={avatar === a}
                    className={avatar === a ? "selected" : "quiet"}
                    onClick={() => setAvatar(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <small>
                Quem cantou menos canta antes. A galera dá nota de 0 a 10 e
                ninguém vota em si. Se todo mundo der 10, rola bis.
              </small>
              <button disabled={busy || invite.data?.open === false}>
                {busy
                  ? "Preparando…"
                  : isNew
                    ? "Criar minha sala"
                    : "Entrar na sala"}
              </button>
              {invite.data?.open === false && (
                <p>Esta sala está fechada para entradas.</p>
              )}
            </form>
            {(error || invite.error) && (
              <p role="alert" className="notice">
                {error || invite.error?.message}
              </p>
            )}
          </section>
        ) : (
          <PartyPreview />
        )}
      </main>
      {!isNew && !isJoin && (
        <section
          className="how-it-works"
          id="como-funciona"
          aria-label="Como funciona"
        >
          <div className="how-heading">
            <h2>É só chegar e soltar a voz.</h2>
            <p>Três passos para transformar o encontro em show.</p>
          </div>
          <ol>
            <li>
              <img
                src="/mascot/v3/step-1.webp"
                alt=""
                width="200"
                height="200"
                loading="lazy"
              />
              <div>
                <h3>Abre a sala</h3>
                <p>Conecte o palco à TV ou ao computador.</p>
              </div>
            </li>
            <li>
              <img
                src="/mascot/v3/step-2.webp"
                alt=""
                width="200"
                height="200"
                loading="lazy"
              />
              <div>
                <h3>Junta a galera</h3>
                <p>Cada pessoa entra pelo QR, com o próprio celular.</p>
              </div>
            </li>
            <li>
              <img
                src="/mascot/v3/step-3.webp"
                alt=""
                width="200"
                height="200"
                loading="lazy"
              />
              <div>
                <h3>Solta a voz</h3>
                <p>Cante, mande reações e dê nota pra quem acabou de cantar.</p>
              </div>
            </li>
          </ol>
          <div className="tutorial-invite">
            <p>Ainda não conseguiu?</p>
            <Link className="button secondary" to="/tutorial">
              Ver tutorial completo
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Pair() {
  const runtime = useQuery({
    queryKey: ["runtime"],
    queryFn: () => api("/health"),
  });
  const developmentPairing = runtime.data?.developmentPairing === true;
  const [roomCode, setRoomCode] = useState(
    () => new URLSearchParams(location.search).get("roomCode") || "",
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  return (
    <main className="narrow">
      <Brand />
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await api("/pairing/redeem", {
              code: code.trim().toUpperCase(),
              ...(developmentPairing && roomCode.trim()
                ? { roomCode: roomCode.trim().toUpperCase() }
                : {}),
            });
            nav(`/stage/${r.roomId}`);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">TELA COMPARTILHADA</p>
        <h1>Conecte o palco</h1>
        {developmentPairing && (
          <>
            <p className="notice">
              Desenvolvimento: informe a sala e use qualquer código de palco não
              vazio. Em produção, o código autorizado é obrigatório.
            </p>
            <label>
              Código da sala (desenvolvimento)
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength={8}
                placeholder="Código de 8 caracteres da sala"
              />
            </label>
          </>
        )}
        <label>
          Código autorizado pelo anfitrião
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={developmentPairing ? 128 : 24}
          />
        </label>
        <button disabled={busy}>Conectar esta tela</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
function RoomView({ stage = false }: { stage?: boolean }) {
  const runtime = useQuery({
    queryKey: ["runtime"],
    queryFn: () => api("/health"),
  });
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.split("/")[3] || "room";
  const [room, setRoom] = useState<Snapshot>();
  const scoreAudio = useStageScoreAudio(
    stage && room?.settings.scoreSound !== false,
  );
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number>();
  const [feedback, setFeedback] = useState("");
  const [undoSong, setUndoSong] = useState<string>();
  useEffect(() => {
    // Volta da criação da sala pelo QR da TV: confirma que ela ligou.
    if (new URLSearchParams(location.search).get("tv") === "ligada") {
      setFeedback("📺 TV ligada! A festa já aparece na tela grande.");
      navigate(location.pathname, { replace: true });
    }
  }, []);
  const [reactionFeedback, setReactionFeedback] = useState<{
    message: string;
  }>();
  useEffect(() => {
    if (!reactionFeedback) return;
    const timeout = setTimeout(() => setReactionFeedback(undefined), 2200);
    return () => clearTimeout(timeout);
  }, [reactionFeedback]);
  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => {
      setFeedback("");
      setUndoSong(undefined);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [feedback]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Video[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [searchedQuery, setSearchedQuery] = useState<string>();
  const [searchLoading, setSearchLoading] = useState(false);
  const suggestedMusic = useQuery<{
    items: Video[];
    mode: string;
    theme?: { id: string; label: string };
  }>({
    queryKey: ["music-suggestions", id],
    queryFn: () => api(`/rooms/${id}/music/suggestions`),
    enabled:
      !stage &&
      tab === "search" &&
      online &&
      room?.me.role === "member" &&
      room.state !== "CLOSED",
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (tab === "search") {
      setSearchedQuery(undefined);
      setCursor(undefined);
      setResults([]);
      setQ("");
    }
  }, [tab, id]);
  const [showGifs, setShowGifs] = useState(true);
  const [reactions, setReactions] = useState<StageReaction[]>([]);
  const hideReactions = room?.settings.reactions === false;
  const reactionsHidden = useRef(hideReactions);
  reactionsHidden.current = hideReactions;
  const [clock, setClock] = useState(Date.now());
  const socketRef = useRef<Socket | null>(null);
  const offset = useRef(0);
  const latest = useRef<Snapshot | undefined>(undefined);
  const applySnapshot = (next: Snapshot) => {
    if (!latest.current || next.version >= latest.current.version) {
      latest.current = next;
      offset.current = next.serverTime - Date.now();
      setRoom(next);
    }
  };
  useEffect(() => {
    // Os mascotes do resultado são background-image: só baixariam na hora
    // da nota. Pré-carrega para aparecerem instantaneamente.
    const idle = setTimeout(() => {
      for (const mood of ["confused", "encouraging", "groove", "celebration"])
        new Image().src = `/mascot/v3/${mood}.webp`;
    }, 1500);
    return () => clearTimeout(idle);
  }, []);
  useEffect(() => {
    let cancelled = false;
    latest.current = undefined;
    setRoom(undefined);
    setError("");
    const s = io({
      auth: { roomId: id, stage },
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
    socketRef.current = s;
    s.on("connect", () => {
      setOnline(true);
      setError("");
      s.emit("session.sync");
    });
    s.on("disconnect", () => setOnline(false));
    s.on("connect_error", () => {
      setOnline(false);
      setError(
        "Não conseguimos abrir a sala neste celular. Confira a internet ou entre de novo pelo QR da TV.",
      );
    });
    s.on("room.state", applySnapshot);
    s.on("reaction.display", async (r) => {
      if (
        !stage ||
        reactionsHidden.current ||
        r.expiresAt <= Date.now() + offset.current
      )
        return;
      if (r.type === "GIF") {
        if (!stage) return;
        try {
          const g = await giphy(r.value);
          if (!["g", "pg", "pg-13"].includes(g.data.rating)) return;
          r.url =
            g.data.images.original?.webp ||
            g.data.images.downsized_medium?.url ||
            g.data.images.downsized?.url ||
            g.data.images.fixed_height?.webp ||
            g.data.images.fixed_height.url;
          r.fallbackUrl =
            g.data.images.downsized?.url || g.data.images.fixed_height.url;
          r.title = g.data.title;
        } catch {
          return;
        }
      }
      if (!cancelled && r.expiresAt > Date.now() + offset.current) {
        const incoming = stageReaction(r, Date.now() + offset.current);
        setReactions((old) => {
          if (old.some((value) => value.id === r.id)) return old;
          const living = old.filter(
            (value) => value.expiresAt > Date.now() + offset.current,
          );
          if (incoming.type === "GIF")
            return [
              ...living.filter((value) => value.type === "EMOJI"),
              incoming,
            ];
          return [
            ...living.filter((value) => value.type === "EMOJI").slice(-7),
            incoming,
            ...living.filter((value) => value.type === "GIF"),
          ];
        });
      }
    });
    void api<Snapshot>(`/rooms/${id}/snapshot${stage ? "?stage=1" : ""}`)
      .then((r) => {
        if (cancelled) return;
        applySnapshot(r);
        s.connect();
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    const offline = () => {
      setOnline(false);
      s.disconnect();
    };
    const online = () => s.connect();
    // Ao desbloquear o celular/voltar à aba, reconecta na hora em vez de
    // esperar o backoff do socket.io, e pede o estado atual da sala.
    const resumed = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (s.connected) s.emit("session.sync");
      else s.connect();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", resumed);
    window.addEventListener("pageshow", resumed);
    const heart = setInterval(() => {
      if (s.connected) s.emit("presence.heartbeat");
    }, 5000);
    const timer = setInterval(() => {
      setClock(Date.now() + offset.current);
      setReactions((old) =>
        old.filter((r) => r.expiresAt > Date.now() + offset.current),
      );
    }, 250);
    return () => {
      cancelled = true;
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", resumed);
      window.removeEventListener("pageshow", resumed);
      s.disconnect();
      s.removeAllListeners();
      socketRef.current = null;
      clearInterval(heart);
      clearInterval(timer);
    };
  }, [id, stage]);
  useEffect(() => {
    setScore(undefined);
  }, [room?.current?.id]);
  async function command(
    kind: Command["kind"],
    payload: Record<string, unknown> = {},
    silent = false,
  ) {
    if (!online)
      throw new Error(
        "Sem internet agora. Confira o Wi-Fi ou os dados móveis; reconectamos sozinhos.",
      );
    if (!silent) setBusy(true);
    setError("");
    try {
      const r = await api(`/rooms/${id}/commands${stage ? "?stage=1" : ""}`, {
        commandId: commandId(),
        kind,
        payload,
      });
      if (r.snapshot) applySnapshot(r.snapshot);
      if (kind === "REMOVE_SONG") setFeedback("Música removida da fila.");
      return r;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      if (!silent) setBusy(false);
    }
  }
  const act = (kind: Command["kind"], payload: Record<string, unknown> = {}) =>
    void command(kind, payload).catch(() => {});
  // Um toque adiciona; o aviso oferece "Desfazer" por alguns segundos.
  async function addSong(videoId: string, title: string) {
    try {
      await command("ADD", { videoId });
    } catch {
      return;
    }
    const mine = (latest.current?.songs || [])
      .filter(
        (s) =>
          s.video.id === videoId &&
          s.personId === latest.current?.me.id &&
          s.status === "WAITING",
      )
      .sort((a, b) => b.seq - a.seq)[0];
    setFeedback(`✓ “${title}” entrou na fila!`);
    setUndoSong(mine?.id);
  }
  const host = room?.me.role === "member" && room?.hostId === room?.me.id;
  const tourRole = host ? "host" : "guest";
  const [tourOpen, setTourOpen] = useState(false);
  const tourChecked = useRef(false);
  const roomReady = !!room && room.me.role === "member";
  // Trocar de aba volta ao topo, onde fica o cartão "o que fazer agora".
  useEffect(() => {
    if (!stage) window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, stage]);
  const [push, setPush] = useState<PushStatus>("unsupported");
  useEffect(() => {
    if (stage || !roomReady) return;
    void pushStatus().then(setPush);
    void resumePush(id);
  }, [stage, roomReady, id]);
  useEffect(() => {
    // Primeira visita: o mascote guia a pessoa pela sala uma única vez.
    if (stage || !roomReady || tourChecked.current) return;
    tourChecked.current = true;
    if (room!.state !== "CLOSED" && !tourSeen(tourRole)) setTourOpen(true);
  }, [stage, roomReady]);
  // Avisos: vibra e mostra um aviso quando é a vez da pessoa, quando ela é a
  // próxima e quando a votação abre, para ninguém precisar ficar vigiando.
  const meId = room?.me.role === "member" ? room.me.id : undefined;
  const singingNow =
    !!meId &&
    room?.current?.singerId === meId &&
    ["PREPARING", "PLAYING", "PAUSED"].includes(room.state);
  const nextUp =
    !!meId &&
    !singingNow &&
    room?.queue[0]?.personId === meId &&
    !!room.current;
  const voteNow = !!room?.canVote && room.myVote === undefined;
  const alertKind = stage
    ? undefined
    : singingNow
      ? "turn"
      : voteNow
        ? "vote"
        : nextUp
          ? "next"
          : undefined;
  const alertKey = alertKind && `${alertKind}:${room?.current?.id}`;
  const [dismissedAlert, setDismissedAlert] = useState<string>();
  useEffect(() => {
    if (!alertKey) return;
    try {
      navigator.vibrate?.(
        alertKind === "turn" ? [400, 150, 400, 150, 400] : [200, 100, 200],
      );
    } catch {
      /* sem vibração neste aparelho */
    }
    const original = document.title;
    if (document.hidden)
      document.title =
        alertKind === "turn"
          ? "🎤 É a sua vez!"
          : alertKind === "vote"
            ? "⭐ Hora de votar!"
            : "⏭️ Você é o próximo!";
    const restore = () => {
      if (!document.hidden) document.title = original;
    };
    document.addEventListener("visibilitychange", restore);
    return () => {
      document.removeEventListener("visibilitychange", restore);
      document.title = original;
    };
  }, [alertKey]);
  const inviteUrl = room ? `${locationOrigin()}/join/${room.code}` : "";
  async function music(more = false) {
    const term = more ? searchedQuery || q.trim() : q.trim();
    setBusy(true);
    setSearchLoading(true);
    setError("");
    try {
      const r = await api(
        `/rooms/${id}/music/search?q=${encodeURIComponent(term)}${more && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      setResults((old) => (more ? [...old, ...r.items] : r.items));
      setCursor(r.cursor);
      setSearchedQuery(term);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setSearchLoading(false);
    }
  }
  function react(type: string, value: string) {
    if (!online) return;
    socketRef.current
      ?.timeout(4000)
      .emit("reaction.send", { type, value }, (err: any, r: any) => {
        if (err) setError("Reação não confirmada.");
        else if (r.error) setError(r.error);
        else
          setReactionFeedback({
            message:
              type === "GIF"
                ? r.gifsLeft === 0
                  ? "GIF enviado · esse foi seu último GIF nesta música"
                  : r.gifsLeft === 1
                    ? "GIF enviado · você ainda tem 1 GIF nesta música"
                    : "GIF enviado"
                : "Reação enviada",
          });
      });
  }
  const inviteCard = room && (
    <section className="invite card">
      <p className="eyebrow">ESCANEIE PARA ENTRAR</p>
      <div className="qr">
        <QRCodeSVG value={inviteUrl} size={184} level="M" marginSize={3} />
      </div>
      <strong className="room-code">{room.code}</strong>
      <a className="invite-link" href={inviteUrl}>
        {inviteUrl}
      </a>
      <p>Seu celular é o controle da festa.</p>
      {!room.settings.entry && <small>Novas entradas pausadas</small>}
    </section>
  );
  function result(p: PublicPerformance, live = false) {
    const singer = room?.people.find((x) => x.id === p.singerId);
    return (
      <ScoreResult
        key={p.id}
        performance={p}
        singer={singer?.name || "Participante"}
        song={
          room?.songs.find((s) => s.id === p.songId)?.video.title ||
          "uma música"
        }
        animate={live && tab !== "summary" && room?.state === "RESULTS"}
        serverNow={Date.now() + offset.current}
        sound={live && scoreAudio.enabled && scoreAudio.ready}
      />
    );
  }
  if (!room)
    return (
      <main className="narrow">
        <Brand />
        <div className="card">
          <h1>Preparando sua sala…</h1>
          {error && <p role="alert">{error}</p>}
          <Link to="/join">Entrar com um código</Link>
          <button onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </main>
    );
  const current = room.songs.find((s) => s.id === room.current?.songId);
  const ownPending = room.songs.find(
    (s) => s.personId === room.me.id && s.status === "WAITING",
  );
  const singer = room.people.find((p) => p.id === room.current?.singerId);
  const round = room.current?.round;
  // Votação antecipada: aberta nos últimos 20s, ainda sem prazo final.
  const earlyVoting =
    !!round &&
    round.closedAt === undefined &&
    round.deadline === undefined &&
    ["PLAYING", "PAUSED"].includes(room.state);
  const votingClosed = round?.deadline !== undefined && clock >= round.deadline;
  const voteControls = room.canVote ? (
    <>
      <div className="vote-grid">
        {Array.from({ length: 11 }, (_, n) => {
          const chosen = (score ?? room.myVote) === n;
          return (
            <button
              key={n}
              data-score={n}
              aria-label={`Nota ${n}`}
              aria-pressed={chosen}
              className={chosen ? "selected" : "quiet"}
              disabled={!online || votingClosed}
              onClick={() => {
                // Um toque já vota; tocar em outra nota troca o voto.
                setScore(n);
                void command("VOTE", { score: n }, true).then(
                  () => setScore((s) => (s === n ? undefined : s)),
                  () => setScore(undefined),
                );
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p role="status" className="vote-status">
        {room.myVote !== undefined
          ? `✓ Sua nota: ${room.myVote}. Mudou de ideia? É só tocar em outra.`
          : "Toque na nota. Dá pra trocar enquanto a votação estiver aberta."}
      </p>
    </>
  ) : room.myVote !== undefined ? (
    <p role="status">✓ Sua nota: {room.myVote}</p>
  ) : (
    <p>
      {room.current?.singerId === room.me.id
        ? "Aproveite os aplausos! O cantor não vota."
        : "Você acompanha esta rodada. Vote na próxima!"}
    </p>
  );
  const voting = (
    <section className="card vote" aria-label="Votação da apresentação">
      <p className="eyebrow">
        {singer?.name} {earlyVoting ? "TÁ NA RETA FINAL" : "DEU UM SHOW"}
      </p>
      <h2>{stage ? "Vote pelo celular" : "Qual nota essa voz merece?"}</h2>
      {earlyVoting ? (
        <p className="countdown-note" role="status">
          Votação aberta! Fecha 10 segundos depois que a música acabar.
        </p>
      ) : (
        <div className="countdown" aria-label="Tempo restante">
          {Math.max(0, Math.ceil(((round?.deadline || 0) - clock) / 1000))}
          <small> segundos</small>
        </div>
      )}
      <p>
        {round?.received} de {round?.eligibleCount} votos recebidos
      </p>
      {!stage && voteControls}
    </section>
  );
  // Cartão "o que fazer agora": uma única ação principal conforme o momento.
  const pushPrompt =
    push === "off" ? (
      <button
        className="action-push"
        onClick={() =>
          void enablePush(id)
            .then(setPush)
            .catch(() =>
              setError(
                "Não deu para ligar os avisos neste celular. Tente de novo mais tarde.",
              ),
            )
        }
      >
        🔔 Me avise quando for minha vez
      </button>
    ) : push === "on" ? (
      <p className="action-push-note">
        🔔 Avisos ligados: a gente te chama quando chegar sua vez.
      </p>
    ) : push === "install" ? (
      <p className="action-push-note">
        📲 No iPhone, para receber avisos com a tela bloqueada: toque em{" "}
        <strong>Compartilhar</strong> e depois em{" "}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
    ) : push === "denied" ? (
      <p className="action-push-note">
        As notificações estão bloqueadas neste navegador. Libere nas
        configurações para receber avisos.
      </p>
    ) : null;
  const myQueueIndex = room.queue.findIndex((s) => s.personId === room.me.id);
  const myNextSong = myQueueIndex >= 0 ? room.queue[myQueueIndex] : undefined;
  const actionKind = singingNow
    ? "turn"
    : room.state === "VOTING" || earlyVoting
      ? "vote"
      : myQueueIndex === 0
        ? "next"
        : myNextSong
          ? "queue"
          : "choose";
  const voteSeconds = Math.max(
    0,
    Math.ceil(((round?.deadline || 0) - clock) / 1000),
  );
  const actionCard =
    room.me.role !== "member" || room.state === "CLOSED" ? null : (
      <section
        className="action-card"
        data-kind={actionKind}
        aria-label="O que fazer agora"
      >
        {actionKind === "choose" && (
          <>
            <p className="action-eyebrow">Sua vez de brilhar</p>
            <h2>Qual música você quer cantar?</h2>
            <p>
              Escolha uma e entre na fila. A TV avisa quando chegar sua vez.
            </p>
            <Link className="button action-main" to={`/r/${id}/search`}>
              🎤 Escolher música
            </Link>
            <img
              className="action-mascot"
              src="/mascot/v3/welcome.webp"
              alt=""
            />
          </>
        )}
        {actionKind === "queue" && myNextSong && (
          <>
            <p className="action-eyebrow">Você está na fila</p>
            <h2>
              {myQueueIndex === 1
                ? "Falta 1 música antes da sua"
                : `Faltam ${myQueueIndex} músicas antes da sua`}
            </h2>
            <ol className="action-line" aria-hidden="true">
              {room.current && <li data-now="true">🎤</li>}
              {Array.from({ length: Math.min(myQueueIndex, 4) }, (_, i) => (
                <li key={i}>{i + 1}</li>
              ))}
              {myQueueIndex > 4 && <li>+{myQueueIndex - 4}</li>}
              <li data-me="true">Eu</li>
            </ol>
            <div className="action-song">
              <strong>{myNextSong.video.title}</strong>
              <small>{myNextSong.video.channel}</small>
            </div>
            <p>Pode bloquear o celular. A gente avisa.</p>
            {pushPrompt}
            <img
              className="action-mascot"
              src="/mascot/v3/step-2.webp"
              alt=""
            />
          </>
        )}
        {actionKind === "next" && (
          <>
            <p className="action-eyebrow">Prepare a voz</p>
            <h2>Você é o próximo!</h2>
            <p>
              {room.current
                ? "Fique perto do microfone. Depois desta música é você"
                : "Já já começa. Fique perto do microfone. Você vai cantar"}
              {myNextSong && (
                <>
                  {" "}
                  com <strong>{myNextSong.video.title}</strong>
                </>
              )}
              .
            </p>
            {pushPrompt}
            <img
              className="action-mascot"
              src="/mascot/v3/encouraging.webp"
              alt=""
            />
          </>
        )}
        {actionKind === "turn" && (
          <>
            <p className="action-eyebrow">Agora é com você</p>
            <h2>
              É SUA VEZ!
              <br />
              Pegue o microfone
            </h2>
            <p>A letra aparece na TV. Solta a voz!</p>
            <img
              className="action-mascot"
              src="/mascot/v3/celebration.webp"
              alt=""
            />
          </>
        )}
        {actionKind === "vote" && (
          <>
            <p className="action-eyebrow">
              {singer?.name} {earlyVoting ? "tá na reta final" : "deu um show"}
            </p>
            <h2>Qual nota essa voz merece?</h2>
            <p className="action-timer" role="status">
              {earlyVoting
                ? "Votação aberta! Fecha 10 segundos depois que a música acabar."
                : `Fecha em ${voteSeconds} ${voteSeconds === 1 ? "segundo" : "segundos"}.`}
            </p>
            {voteControls}
          </>
        )}
      </section>
    );
  const queue = (
    <section className="card queue">
      <div className="section-heading">
        <h2>Próximas vozes</h2>
        <span className="pill">{room.queue.length} na fila</span>
      </div>
      <p className="muted">
        Quem cantou menos passa na frente, então essa ordem ainda pode mudar.
      </p>
      {room.queue.length === 0 ? (
        <p>A primeira música está esperando por você.</p>
      ) : (
        <ol>
          {room.queue.slice(0, 100).map((song, i) => {
            const p = room.people.find((p) => p.id === song.personId);
            return (
              <li key={song.id}>
                <span className="position">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{stage ? p?.name : song.video.title}</strong>
                  <small>
                    {stage
                      ? song.video.title
                      : `${p?.avatar} ${p?.name} · ${p?.turns} turnos`}
                    {room.people.filter((x) => x.name === p?.name).length > 1
                      ? ` · ${p?.id.slice(0, 4)}`
                      : ""}
                    {room.offer?.state === "ACCEPTED" &&
                    room.offer.songId === song.id
                      ? " · Bis por nota 10"
                      : ""}
                  </small>
                </div>
                {!stage && (host || song.personId === room.me.id) && (
                  <Confirm
                    label="Remover"
                    onConfirm={() => act("REMOVE_SONG", { songId: song.id })}
                  >
                    A música sairá da fila.
                  </Confirm>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!stage &&
        room.songs.some(
          (s) =>
            s.status === "WAITING" && !room.queue.some((q) => q.id === s.id),
        ) && (
          <p className="muted">
            Algumas músicas estão pausadas porque quem pediu saiu. Elas voltam
            pra fila quando a pessoa reconectar.
          </p>
        )}
    </section>
  );
  const controls = host && room.state !== "CLOSED" && (
    <section className="card host-controls">
      <p className="eyebrow">VOCÊ CONDUZ A FESTA</p>
      <label className="check">
        <input
          type="checkbox"
          checked={room.settings.autoPlay !== false}
          disabled={!online || busy}
          onChange={(e) => act("SETTINGS", { autoPlay: e.target.checked })}
        />
        Tocar fila automaticamente
      </label>
      {room.autoPlayError && <p role="alert">{room.autoPlayError}</p>}
      <div className="actions">
        {["LOBBY", "RESULTS"].includes(room.state) && (
          <button
            disabled={
              !online ||
              busy ||
              (room.state === "RESULTS" &&
                clock - (round?.closedAt || 0) < 5000)
            }
            onClick={() => act("PREPARE")}
          >
            Preparar próxima ↗
          </button>
        )}
        {["PREPARING", "PAUSED", "RECOVERY"].includes(room.state) && (
          <button
            disabled={!online || busy}
            onClick={() => act(room.state === "PREPARING" ? "START" : "RESUME")}
          >
            ▶ Iniciar / retomar
          </button>
        )}
        {room.state === "PLAYING" && (
          <button disabled={!online || busy} onClick={() => act("PAUSE")}>
            Pausar
          </button>
        )}
        {["PREPARING", "PLAYING", "PAUSED", "RECOVERY"].includes(
          room.state,
        ) && (
          <>
            <Confirm label="Pular música" onConfirm={() => act("SKIP")}>
              Se a música já começou, conta como a vez da pessoa e fica sem
              nota.
            </Confirm>
            <Confirm
              label="Cancelar por falha"
              onConfirm={() => act("TECHNICAL_CANCEL")}
            >
              A pessoa não perde a vez. Adicione outro vídeo para tentar de
              novo.
            </Confirm>
          </>
        )}
      </div>
      {room.state === "RECOVERY" && (
        <p>
          Reconecte ou pareie o palco. Depois retome a apresentação ou cancele
          por falha técnica.
        </p>
      )}
    </section>
  );
  return (
    <div
      data-state={room.state}
      className={stage ? "stage-shell" : "room-shell"}
    >
      {!stage && (
        <header className="room-header">
          <Brand />
          <div>
            <span className="live-dot" /> {room.name}{" "}
            <span className="pill" data-room-code>
              {room.code}
            </span>
          </div>
          <span className="connection">
            {online ? "● Conectado" : "○ Reconectando…"}
          </span>
          <div className="header-tools">
            <LargeTextToggle />
            <button
              type="button"
              className="quiet tour-help"
              data-tour="help"
              onClick={() => setTourOpen(true)}
            >
              <span aria-hidden="true">?</span> Tutorial
            </button>
          </div>
        </header>
      )}
      {tourOpen && !stage && room.me.role === "member" && (
        <GuidedTour
          role={tourRole}
          steps={tourSteps(tourRole, `/r/${id}`, { tvOn: room.epoch > 0 })}
          onClose={() => setTourOpen(false)}
        />
      )}
      {room.integrationMode === "demo" && (
        <div className="demo-banner">
          DEMONSTRAÇÃO · A busca e o player são simulados. Salas, fila e votos
          funcionam de verdade.
        </div>
      )}
      {!online && (
        <div role="status" className="connection-banner">
          Reconectando… suas músicas continuam na sala. Aguarde para enviar
          ações.
        </div>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {alertKey &&
        alertKind !== "vote" &&
        tab !== "room" &&
        dismissedAlert !== alertKey && (
          <div
            className="turn-alert"
            data-kind={alertKind}
            role="alert"
            aria-live="assertive"
          >
            <strong>
              {alertKind === "turn"
                ? "🎤 É a sua vez! Pegue o microfone."
                : "⏭️ Você é o próximo! Fique perto do microfone."}
            </strong>
            <button
              className="quiet"
              onClick={() => setDismissedAlert(alertKey)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}
      {!stage && feedback && (
        <div className="feedback" role="status">
          {feedback}
          {undoSong && (
            <button
              className="quiet feedback-undo"
              onClick={() => {
                const songId = undoSong;
                setUndoSong(undefined);
                act("REMOVE_SONG", { songId });
              }}
            >
              Desfazer
            </button>
          )}
          <button
            className="quiet"
            onClick={() => {
              setFeedback("");
              setUndoSong(undefined);
            }}
            aria-label="Fechar confirmação"
          >
            ×
          </button>
        </div>
      )}
      {!stage && reactionFeedback && (
        <div
          className="reaction-feedback"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Icon name="check" />
          {reactionFeedback.message}
        </div>
      )}
      {stage ? (
        <main
          className={`stage-layout${!hideReactions && reactions.some((r) => r.type === "GIF") ? " has-gif" : ""}`}
        >
          <div className="stage-main">
            {!current && <p className="eyebrow">{stateNames[room.state]}</p>}
            {current && (
              <div className="now-heading">
                <h1>{current.video.title}</h1>
                <p>
                  {singer?.avatar} {singer?.name} · {current.video.channel} ·
                  YouTube
                </p>
              </div>
            )}
            <Player
              room={room}
              socket={socketRef.current}
              connected={online}
              report={async (event, seq, performanceId) => {
                await command("REPORT", { event, seq, performanceId }, true);
              }}
            />
            {room.state === "VOTING" && voting}
            {room.state === "RESULTS" &&
              room.current &&
              result(room.current, true)}
            {room.state === "CLOSED" && (
              <h1>Obrigado pelo show. Até o próximo bis!</h1>
            )}
            <EmojiRain reactions={reactions} hidden={hideReactions} />
          </div>
          <aside className="stage-sidebar">
            {inviteCard}
            {queue}
            <GifSpotlight
              reactions={reactions}
              hidden={hideReactions || !room.settings.gifs}
              display={room.settings.gifDisplay}
            />
          </aside>
        </main>
      ) : (
        <>
          <main className="mobile-content">
            <section
              className={`room-title${current && tab === "room" && ["PLAYING", "PREPARING"].includes(room.state) ? " compact-state" : ""}`}
            >
              <div>
                <p className="eyebrow">
                  {host ? "ANFITRIÃO" : "A GALERA TÁ ON"}
                </p>
                <h1>{stateNames[room.state]}</h1>
              </div>
              <span className="avatar-large">
                {room.people.find((p) => p.id === room.me.id)?.avatar}
              </span>
            </section>
            {(room.state === "VOTING" || earlyVoting) &&
              tab !== "room" &&
              voting}
            {room.state === "RESULTS" &&
              room.current &&
              result(room.current, true)}
            {room.offer?.personId === room.me.id &&
              room.state === "RESULTS" &&
              room.offer.state === "OFFERED" && (
                <section className="card encore-card">
                  <h2>Nota 10! Quer cantar mais uma?</h2>
                  <p>
                    Sua próxima música da fila passa pra frente. Depois desse
                    bis, você só ganha outro quando mais quatro músicas
                    terminarem.
                  </p>
                  <div className="actions">
                    <button
                      onClick={() => act("ENCORE", { accept: true })}
                      disabled={!online || busy}
                    >
                      Quero um bis!
                    </button>
                    <button
                      className="quiet"
                      onClick={() => act("ENCORE", { accept: false })}
                      disabled={!online || busy}
                    >
                      Agora não
                    </button>
                  </div>
                </section>
              )}
            {tab === "room" && (
              <>
                {host && room.state !== "CLOSED" && room.epoch === 0 && (
                  <section className="card stage-shortcut">
                    <div>
                      <p className="eyebrow">PALCO E TV</p>
                      <h2>Coloque a festa na tela grande</h2>
                      <p>
                        Abra o site na TV, escolha Usar como palco e aponte a
                        câmera do celular para o QR.
                      </p>
                    </div>
                    <Link className="button" to={`/r/${id}/stage`}>
                      Ligar a TV
                    </Link>
                  </section>
                )}
                {actionCard}
                {current && !["VOTING", "RESULTS"].includes(room.state) && (
                  <div className="current-stack">
                    <section className="card current">
                      <div className="current-info">
                        <p className="live-label">
                          <i /> Agora no palco
                        </p>
                        <h2>{current.video.title}</h2>
                        <p className="current-channel">
                          {current.video.channel}
                        </p>
                        <p className="current-singer">
                          <span>{singer?.name} no microfone</span>
                          <Icon name="mic" />
                        </p>
                      </div>
                    </section>
                  </div>
                )}
                {room.state !== "CLOSED" && (
                  <section
                    className="card reactions-card"
                    data-tour="reactions"
                  >
                    <h2>Mande energia para o palco</h2>
                    <div className="emoji-row">
                      {["👏", "🔥", "❤️", "🌟", "🎉", "🎤"].map((e) => (
                        <button
                          key={e}
                          aria-label={`Enviar ${e}`}
                          className="quiet"
                          disabled={!online || !room.settings.reactions}
                          onClick={() => react("EMOJI", e)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {room.state !== "CLOSED" && room.settings.gifs && (
                  <section
                    className="card gifs-card"
                    aria-label="Reações com GIFs"
                  >
                    <div className="section-heading">
                      <h2>GIFs da galera</h2>
                      <button
                        className="quiet"
                        onClick={() => setShowGifs(!showGifs)}
                        aria-expanded={showGifs}
                        aria-controls="player-gif-picker"
                      >
                        <Icon name="arrow" className="gif-toggle-icon" />
                        {showGifs ? "Minimizar GIFs" : "Expandir GIFs"}
                      </button>
                    </div>
                    <div id="player-gif-picker" hidden={!showGifs}>
                      <GifPicker send={react} />
                    </div>
                    <small>
                      GIFs aparecem somente no palco para economizar dados.
                    </small>
                  </section>
                )}
              </>
            )}
            {tab === "search" && (
              <section className="card search-panel">
                <p className="eyebrow">SEU PRÓXIMO HIT</p>
                <h2>Qual música você quer cantar?</h2>
                <form
                  data-tour="search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void music();
                  }}
                >
                  <label htmlFor="music">Música ou artista</label>
                  <div className="input-row">
                    <input
                      id="music"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      minLength={2}
                      maxLength={120}
                      required
                      placeholder="Procure no YouTube…"
                    />
                    <button
                      disabled={busy || !online || room.state === "CLOSED"}
                    >
                      Buscar
                    </button>
                  </div>
                </form>
                <p className="muted">
                  A busca inclui “karaoke” automaticamente. Resultados do
                  YouTube.
                </p>
                <div className="search-suggestions-heading">
                  <h3>
                    {searchedQuery === undefined
                      ? "Ideias para soltar a voz"
                      : `Resultados para “${searchedQuery}”`}
                  </h3>
                  {searchedQuery === undefined ? (
                    <div className="suggestion-theme">
                      {suggestedMusic.data?.theme && (
                        <strong data-suggestion-theme>
                          {suggestedMusic.data.theme.label}
                        </strong>
                      )}
                      <p className="muted">
                        {room.integrationMode === "demo"
                          ? "Sugestões de demonstração, sem vídeos reais."
                          : "Karaokês do YouTube pra você se inspirar."}
                      </p>
                      <button
                        className="quiet"
                        disabled={!online || suggestedMusic.isFetching}
                        onClick={() => void suggestedMusic.refetch()}
                      >
                        Outras ideias
                      </button>
                    </div>
                  ) : (
                    <button
                      className="quiet"
                      disabled={busy}
                      onClick={() => {
                        setSearchedQuery(undefined);
                        setQ("");
                        setCursor(undefined);
                        setResults([]);
                        void suggestedMusic.refetch();
                      }}
                    >
                      Ver sugestões
                    </button>
                  )}
                </div>
                {searchLoading && <p role="status">Buscando músicas…</p>}
                {searchedQuery === undefined && suggestedMusic.isFetching && (
                  <p role="status">Carregando ideias para cantar…</p>
                )}
                {searchedQuery === undefined && suggestedMusic.isError && (
                  <div className="notice" role="status">
                    <p>
                      As sugestões estão indisponíveis agora. Você pode tentar a
                      busca por uma música ou artista.
                    </p>
                    <button
                      className="quiet"
                      disabled={!online || suggestedMusic.isFetching}
                      onClick={() => void suggestedMusic.refetch()}
                    >
                      Tentar sugestões novamente
                    </button>
                  </div>
                )}
                {!searchLoading &&
                  (searchedQuery !== undefined
                    ? results.length === 0
                    : suggestedMusic.isSuccess &&
                      suggestedMusic.data.items.length === 0) && (
                    <p>
                      Nenhuma música encontrada. Tente buscar uma música ou
                      artista.
                    </p>
                  )}
                <div
                  className="songs"
                  aria-busy={
                    searchLoading ||
                    (searchedQuery === undefined && suggestedMusic.isFetching)
                  }
                >
                  {(searchedQuery === undefined
                    ? suggestedMusic.data?.items || []
                    : results
                  ).map((v) => (
                    <article className="song" key={v.id}>
                      <div className="song-art">
                        {v.thumbnail ? (
                          <img src={v.thumbnail} alt="" loading="lazy" />
                        ) : (
                          <Icon name="music" />
                        )}
                        <span className="song-duration">
                          {Math.floor(v.duration / 60)}:
                          {String(v.duration % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <h3>{v.title}</h3>
                        <small>
                          {v.channel} · {Math.floor(v.duration / 60)}:
                          {String(v.duration % 60).padStart(2, "0")}
                        </small>
                        {room.songs.some((s) => s.video.id === v.id) && (
                          <small>Essa música já apareceu na sala.</small>
                        )}
                      </div>
                      {room.songs.some(
                        (s) =>
                          s.video.id === v.id &&
                          s.personId === room.me.id &&
                          s.status === "WAITING",
                      ) ? (
                        <button className="quiet" disabled>
                          Na fila ✓
                        </button>
                      ) : (
                        <button
                          className="quiet"
                          disabled={busy || !online}
                          onClick={() => void addSong(v.id, v.title)}
                        >
                          Adicionar
                        </button>
                      )}
                    </article>
                  ))}
                </div>
                {cursor && (
                  <button
                    disabled={busy || !online}
                    onClick={() => void music(true)}
                  >
                    Mais resultados
                  </button>
                )}
              </section>
            )}
            {tab === "queue" && (
              <section className="card my-songs">
                <h2>{host ? "Músicas da sala" : "Minhas músicas"}</h2>
                <p>As próximas vozes aparecem na tela do palco.</p>
                <ul>
                  {room.songs
                    .filter(
                      (s) =>
                        s.status === "WAITING" &&
                        (host || s.personId === room.me.id),
                    )
                    .sort((a, b) => a.seq - b.seq)
                    .map((s) => (
                      <li key={s.id}>
                        <strong>{s.video.title}</strong>
                        <Confirm
                          label="Remover"
                          onConfirm={() => act("REMOVE_SONG", { songId: s.id })}
                        >
                          Remover esta música?
                        </Confirm>
                      </li>
                    ))}
                </ul>
              </section>
            )}
            {tab === "stage" && host && (
              <>
                <section
                  className="card presentation-controls"
                  data-tour="stage-controls"
                >
                  <h2>Controle do palco</h2>
                  <p className="connection">
                    {clock - room.stageSeen < 15000 && room.epoch > 0
                      ? "● Palco conectado"
                      : "○ Aguardando o palco"}
                  </p>
                  <p>A TV fica só com a apresentação. Ajuste por aqui.</p>
                  {(["reactions", "gifs", "scoreSound"] as const).map(
                    (key, i) => (
                      <label className="check" key={key}>
                        <input
                          type="checkbox"
                          checked={room.settings[key] !== false}
                          disabled={busy || !online || room.state === "CLOSED"}
                          onChange={(e) =>
                            act("SETTINGS", { [key]: e.target.checked })
                          }
                        />
                        {
                          [
                            "Mostrar reações no palco",
                            "Permitir GIFs",
                            "Tocar som da revelação da nota",
                          ][i]
                        }
                      </label>
                    ),
                  )}
                  <fieldset
                    disabled={busy || !online || room.state === "CLOSED"}
                  >
                    <legend>GIF no palco</legend>
                    <div className="actions">
                      {(
                        [
                          ["normal", "Tamanho normal"],
                          ["expanded", "Ampliar GIF"],
                          ["minimized", "Minimizar GIF"],
                        ] as const
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          className="quiet"
                          aria-pressed={
                            (room.settings.gifDisplay || "normal") === mode
                          }
                          onClick={() => act("SETTINGS", { gifDisplay: mode })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <details>
                    <summary>Tela cheia e som na TV</summary>
                    <p>
                      O palco já ocupa a janela inteira. Para ocultar as barras
                      do navegador, use a opção de tela cheia da própria TV ou
                      F11 no computador. O navegador pode exigir um toque na TV
                      para liberar o áudio; o celular não consegue conceder essa
                      permissão por ela.
                    </p>
                  </details>
                </section>
                {controls}
                <details
                  className="card stage-pairing"
                  open={room.epoch === 0 || tourOpen}
                >
                  <summary>Ligar a TV</summary>
                  <StageSetup
                    id={id}
                    roomCode={room.code}
                    development={runtime.data?.developmentPairing === true}
                  />
                </details>
                <Link className="text-link" to={`/r/${id}/queue`}>
                  Gerenciar músicas da sala
                </Link>
              </>
            )}
            {(tab === "people" || tab === "settings") && (
              <section className="card">
                <h2>
                  A galera ·{" "}
                  {room.people.filter((p) => p.status === "ACTIVE").length}
                </h2>
                <ul className="people">
                  {room.people.map((p) => (
                    <li key={p.id}>
                      <span className="avatar-large">{p.avatar}</span>
                      <div>
                        <strong>
                          {p.name} {p.id === room.hostId ? "· anfitrião" : ""}
                          {p.id === room.me.id ? " · você" : ""}
                        </strong>
                        <small>
                          {p.status === "REMOVED"
                            ? "Removido"
                            : p.status === "LEFT"
                              ? "Saiu"
                              : clock - p.lastSeen < 15000
                                ? "Conectado"
                                : "Ausente"}{" "}
                          · {p.turns} turnos · #{p.id.slice(0, 4)}
                        </small>
                      </div>
                      {host &&
                        p.id !== room.hostId &&
                        p.status === "ACTIVE" && (
                          <div>
                            <Confirm
                              label="Transferir"
                              onConfirm={() =>
                                act("TRANSFER", { personId: p.id })
                              }
                            >
                              Você passará o comando da sala para {p.name} e
                              perderá os controles de anfitrião.
                            </Confirm>
                            <Confirm
                              label="Remover pessoa"
                              onConfirm={() =>
                                act("REMOVE_PERSON", { personId: p.id })
                              }
                            >
                              Revoga a sessão de {p.name} e invalida o voto da
                              rodada aberta.
                            </Confirm>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
                {host && room.state !== "CLOSED" && (
                  <>
                    <h2>Administração</h2>
                    {(["entry"] as const).map((k, i) => (
                      <label className="check" key={k}>
                        <input
                          type="checkbox"
                          checked={room.settings[k]}
                          disabled={busy || !online}
                          onChange={(e) =>
                            act("SETTINGS", { [k]: e.target.checked })
                          }
                        />
                        {
                          [
                            "Aceitar novas pessoas",
                            "Permitir reações",
                            "Permitir GIFs",
                          ][i]
                        }
                      </label>
                    ))}
                    <Link className="button secondary" to={`/r/${id}/stage`}>
                      Ligar a TV
                    </Link>
                    <Link to={`/r/${id}/queue`}>Gerenciar músicas da sala</Link>
                    <Confirm
                      label="Encerrar sala"
                      onConfirm={() => act("CLOSE")}
                    >
                      A festa acaba para todo mundo. O resumo dos shows fica
                      disponível por 24 horas.
                    </Confirm>
                  </>
                )}
                {!host && room.state !== "CLOSED" && (
                  <Confirm
                    label="Sair da sala"
                    onConfirm={() =>
                      void command("LEAVE")
                        .then(() => navigate("/"))
                        .catch(() => {})
                    }
                  >
                    Suas músicas ficarão suspensas até você entrar novamente.
                  </Confirm>
                )}
              </section>
            )}
            {(tab === "summary" || room.state === "CLOSED") && (
              <section>
                <h2>Os shows da noite</h2>
                {[
                  ...room.history,
                  ...(room.current?.round?.closedAt ? [room.current] : []),
                ]
                  .filter((p) => p.outcome === "COMPLETED")
                  .map((p) => result(p))}
                {room.history.length === 0 && !room.current && (
                  <p>Ninguém terminou de cantar ainda.</p>
                )}
              </section>
            )}
            {tab === "room" && (
              <Link to={`/r/${id}/summary`} className="text-link">
                Ver os shows da noite ↗
              </Link>
            )}
          </main>
          <nav className="bottom-nav" aria-label="Navegação da sala">
            {[
              ["room", "home", "Sala"],
              ["search", "search", "Buscar"],
              [
                host ? "stage" : "queue",
                "queue",
                host ? "Palco" : "Minhas músicas",
              ],
              ["people", "people", host ? "Gerenciar" : "Pessoas"],
            ].map(([key, icon, label]) => (
              <Link
                key={key}
                data-tour={`nav-${key}`}
                aria-current={tab === key ? "page" : undefined}
                to={`/r/${id}${key === "room" ? "" : `/${key}`}`}
              >
                <Icon name={icon as "home" | "search" | "queue" | "people"} />
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
function locationOrigin() {
  return window.location.origin;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/" element={<Entrance />} />
            <Route path="/rooms/new" element={<Entrance />} />
            <Route path="/join/:code?" element={<Entrance />} />
            <Route path="/stage/pair" element={<Pair />} />
            <Route path="/stage/tv" element={<TvSetup />} />
            <Route path="/connect-tv" element={<ApproveTv />} />
            <Route path="/stage/:id" element={<RoomView stage />} />
            <Route path="/r/:id/*" element={<RoomView />} />
            <Route
              path="*"
              element={
                <main className="narrow">
                  <h1>Este palco não existe.</h1>
                  <Link to="/">Voltar ao início</Link>
                </main>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
