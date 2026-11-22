import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Snapshot } from "../../../packages/contracts/src/index.js";
import { youtubeErrorMessage } from "./youtube-errors";
import { isAppleTouch, onPlayerState } from "./player-state";
let youtubePromise: Promise<void> | undefined;
function loadYoutube() {
  return (youtubePromise ??= new Promise((resolve, reject) => {
    if ((window as any).YT?.Player) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      youtubePromise = undefined;
      reject(
        new Error(
          "O YouTube não respondeu. Verifique a rede e tente preparar novamente.",
        ),
      );
    }, 15000);
    (window as any).onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      clearTimeout(timeout);
      youtubePromise = undefined;
      reject(new Error("O player não carregou. Verifique a conexão."));
    };
    document.head.append(s);
  }));
}
const FINALE_SECONDS = 20;
export function Player({
  room,
  socket,
  connected,
  report,
}: {
  room: Snapshot;
  socket: Socket | null;
  connected: boolean;
  report: (event: string, seq: number, performanceId: string) => Promise<void>;
}) {
  const el = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const latest = useRef(room);
  latest.current = room;
  const reportRef = useRef(report);
  reportRef.current = report;
  const connectedRef = useRef(connected);
  connectedRef.current = !!socket?.connected;
  const seq = useRef(0);
  const reports = useRef(Promise.resolve());
  const wantsPlayback = useRef(false);
  const playerReady = useRef(false);
  const playRequestedAt = useRef(0);
  const pauseRequestedAt = useRef(0);
  /** Vídeo da apresentação atual: eventos de outro vídeo são ignorados. */
  const videoRef = useRef<string | undefined>(undefined);
  const videoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [ready, setReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const perfId = room.current?.id;
  const videoId = room.songs.find((s) => s.id === room.current?.songId)?.video
    .id;
  const demo = room.integrationMode === "demo";
  const apple = isAppleTouch();
  const send = (event: string) => {
    const id = latest.current.current?.id;
    if (id) {
      const reportSeq = ++seq.current;
      reports.current = reports.current
        .then(() => reportRef.current(event, reportSeq, id))
        .catch((e) => setNotice(e.message));
    }
  };
  const blockedNotice = () =>
    setNotice(
      apple
        ? "O iPhone/iPad só libera o som com um toque: toque no botão ▶ do próprio vídeo. Depois disso, as próximas músicas começam sozinhas."
        : "O navegador bloqueou o início com som. Toque em “Ativar som e iniciar” nesta tela para liberar a reprodução.",
    );
  const requestPlay = () => {
    playRequestedAt.current = Date.now();
    player.current?.playVideo();
  };
  const requestPause = () => {
    pauseRequestedAt.current = Date.now();
    player.current?.pauseVideo();
  };

  // Um único player do YouTube para a noite toda. No iPhone, o som liberado pelo
  // primeiro toque vale para o mesmo player; recriar a cada música exigiria um
  // toque novo em todas elas.
  useEffect(() => {
    if (demo) {
      playerReady.current = true;
      setReady(true);
      return;
    }
    let cancelled = false;
    let instance: any;
    void loadYoutube()
      .then(() => {
        if (cancelled || !el.current) return;
        const target = document.createElement("div");
        el.current.replaceChildren(target);
        instance = new (window as any).YT.Player(target, {
          width: "100%",
          height: "100%",
          playerVars: {
            origin: location.origin,
            playsinline: 1,
            fs: 0,
            rel: 0,
            autoplay: 0,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerReady.current = true;
              setReady(true);
            },
            onAutoplayBlocked: () => {
              if (cancelled) return;
              setAutoplayBlocked(true);
              blockedNotice();
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              const playing = e.target?.getVideoData?.()?.video_id;
              if (playing && videoRef.current && playing !== videoRef.current)
                return;
              if ([1, 2, 3, 5].includes(e.data))
                clearTimeout(videoTimer.current);
              const action = onPlayerState(e.data, {
                roomState: latest.current.state,
                connected: connectedRef.current,
                now: Date.now(),
                playRequestedAt: playRequestedAt.current,
                pauseRequestedAt: pauseRequestedAt.current,
              });
              if (action.kind === "pause") requestPause();
              else if (action.kind === "blocked") {
                setAutoplayBlocked(true);
                blockedNotice();
              } else if (action.kind === "report") {
                if (action.event === "PLAYING") {
                  wantsPlayback.current = true;
                  setAutoplayBlocked(false);
                  setNotice("");
                }
                send(action.event);
              }
            },
            onError: (event: { data: number }) => {
              if (cancelled) return;
              clearTimeout(videoTimer.current);
              wantsPlayback.current = false;
              setAutoplayBlocked(false);
              setNotice(youtubeErrorMessage(event.data, location.hostname));
              send("ERROR");
            },
          },
        });
        player.current = instance;
      })
      .catch((e) => {
        if (!cancelled) {
          setNotice(e.message);
          send("ERROR");
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(videoTimer.current);
      instance?.destroy();
      player.current = null;
      playerReady.current = false;
      setReady(false);
    };
  }, [demo]);

  // Nova apresentação: troca o vídeo no mesmo player.
  useEffect(() => {
    seq.current = room.current?.lastReport || 0;
    wantsPlayback.current = ["PREPARING", "PLAYING"].includes(room.state);
    setAutoplayBlocked(false);
    setNotice("");
    if (!perfId || demo || !ready || !videoId) return;
    videoRef.current = videoId;
    if (wantsPlayback.current) {
      playRequestedAt.current = Date.now();
      player.current?.loadVideoById(videoId);
    } else player.current?.cueVideoById(videoId);
    clearTimeout(videoTimer.current);
    videoTimer.current = setTimeout(() => {
      setNotice(
        "O vídeo não ficou pronto. O anfitrião pode cancelar por falha e tentar outro.",
      );
      send("ERROR");
    }, 15000);
    // Se o play pedido não engrenar (bloqueio silencioso do Safari), pede toque.
    const watchdog = setTimeout(() => {
      if (
        wantsPlayback.current &&
        player.current?.getPlayerState?.() !== 1 &&
        ["PREPARING", "PLAYING"].includes(latest.current.state)
      ) {
        setAutoplayBlocked(true);
        blockedNotice();
      }
    }, 5000);
    return () => clearTimeout(watchdog);
  }, [perfId, demo, ready]);
  useEffect(() => {
    if (!demo || !perfId || room.state !== "PREPARING" || !connected) return;
    const start = () => {
      if (latest.current.state === "PREPARING" && socket?.connected)
        send("PLAYING");
    };
    const timer = setTimeout(start, 0);
    return () => clearTimeout(timer);
  }, [perfId, demo, connected, room.state]);
  useEffect(() => {
    if (
      !demo &&
      ready &&
      connected &&
      wantsPlayback.current &&
      ["PREPARING", "PLAYING"].includes(latest.current.state)
    )
      requestPlay();
  }, [perfId, demo, ready, connected]);
  useEffect(() => {
    const command = (c: any) => {
      if (
        c.performanceId !== latest.current.current?.id ||
        c.epoch !== latest.current.epoch
      )
        return;
      wantsPlayback.current = c.action !== "PAUSE";
      if (demo) {
        if (c.action === "PAUSE") send("PAUSED");
        else send("PLAYING");
      } else if (c.action === "PAUSE") requestPause();
      else if (playerReady.current) requestPlay();
    };
    const disconnected = () => {
      wantsPlayback.current = false;
      requestPause();
    };
    socket?.on("playback.command", command);
    socket?.on("disconnect", disconnected);
    return () => {
      socket?.off("playback.command", command);
      socket?.off("disconnect", disconnected);
    };
  }, [socket, demo]);
  // Avisa o servidor quando faltam ~20s para abrir a votação antecipada.
  const finaleOpen = !!room.current?.round;
  useEffect(() => {
    if (demo || !ready || room.state !== "PLAYING" || finaleOpen) return;
    let sent = false;
    const check = () => {
      const p = player.current;
      const duration = p?.getDuration?.() || 0;
      const time = p?.getCurrentTime?.() || 0;
      if (!sent && duration > 0 && duration - time <= FINALE_SECONDS) {
        sent = true;
        send("FINALE");
      }
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [perfId, demo, ready, room.state, finaleOpen]);
  useEffect(() => {
    if (
      ["PAUSED", "RECOVERY", "VOTING", "RESULTS", "CLOSED"].includes(room.state)
    ) {
      wantsPlayback.current = false;
      requestPause();
    }
  }, [room.state]);
  return (
    <section className="player-area" aria-label="Reprodução do palco">
      {/* O quadro do player fica sempre montado para não perder o som liberado. */}
      <div
        className="player-frame"
        ref={el}
        style={perfId ? undefined : { display: "none" }}
      >
        {demo && perfId && (
          <div className="demo-player">
            <span>🎤</span>
            <h2>Player de demonstração</h2>
            <p>Nenhum vídeo ou áudio real. Simule os eventos abaixo.</p>
          </div>
        )}
      </div>
      {perfId ? (
        <div className="player-actions">
          {autoplayBlocked &&
            ["PREPARING", "PLAYING", "PAUSED"].includes(room.state) &&
            !apple && (
              <button
                disabled={!demo && !ready}
                onClick={() => {
                  wantsPlayback.current = true;
                  demo ? send("PLAYING") : requestPlay();
                }}
              >
                ▶ Ativar som e iniciar
              </button>
            )}
          {demo && room.state === "PLAYING" && !finaleOpen && (
            <button className="quiet" onClick={() => send("FINALE")}>
              Simular reta final
            </button>
          )}
          {demo && room.state === "PLAYING" && (
            <button onClick={() => send("ENDED")}>Simular término</button>
          )}
          {demo && ["PREPARING", "PLAYING", "PAUSED"].includes(room.state) && (
            <button className="quiet" onClick={() => send("ERROR")}>
              Simular falha
            </button>
          )}
        </div>
      ) : (
        <div className="stage-welcome">
          <img
            src="/mascot/v3/welcome.webp"
            alt="Mascote microfone dando boas-vindas"
          />
          <p className="eyebrow">TODO MUNDO TEM SUA VEZ</p>
          <h1>
            O próximo show
            <br />é de vocês.
          </h1>
          <p>Entre pelo QR code, escolha uma música e solte a voz.</p>
        </div>
      )}
      {notice && (
        <p role="alert" className="notice">
          {notice}
        </p>
      )}
    </section>
  );
}
