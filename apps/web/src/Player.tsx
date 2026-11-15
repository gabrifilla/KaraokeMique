import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Snapshot } from "../../../packages/contracts/src/index.js";
import { youtubeErrorMessage } from "./youtube-errors";
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
  const seq = useRef(0);
  const reports = useRef(Promise.resolve());
  const wantsPlayback = useRef(false);
  const playerReady = useRef(false);
  const [ready, setReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const perfId = room.current?.id;
  const demo = room.integrationMode === "demo";
  const send = (event: string) => {
    const id = latest.current.current?.id;
    if (id) {
      const reportSeq = ++seq.current;
      reports.current = reports.current
        .then(() => reportRef.current(event, reportSeq, id))
        .catch((e) => setNotice(e.message));
    }
  };
  useEffect(() => {
    seq.current = room.current?.lastReport || 0;
    wantsPlayback.current = ["PREPARING", "PLAYING"].includes(room.state);
    playerReady.current = false;
    setReady(false);
    setAutoplayBlocked(false);
    setNotice("");
    if (!perfId) return;
    if (demo) {
      playerReady.current = true;
      setReady(true);
      return;
    }
    let cancelled = false;
    let instance: any;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    void loadYoutube()
      .then(() => {
        if (cancelled || !el.current) return;
        const target = document.createElement("div");
        el.current.replaceChildren(target);
        instance = new (window as any).YT.Player(target, {
          width: "100%",
          height: "100%",
          videoId: room.songs.find((s) => s.id === room.current?.songId)?.video
            .id,
          playerVars: {
            origin: location.origin,
            playsinline: 1,
            fs: 0,
            rel: 0,
            // Explicit play on readiness also handles commands arriving while loading.
            autoplay: 0,
          },
          events: {
            onReady: () => {
              clearTimeout(readyTimer);
              if (cancelled) return;
              playerReady.current = true;
              setReady(true);
            },
            onAutoplayBlocked: () => {
              if (cancelled) return;
              setAutoplayBlocked(true);
              setNotice(
                "O navegador bloqueou o início com som. Toque em “Ativar som e iniciar” nesta tela para liberar a reprodução.",
              );
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              if (e.data === 1) {
                if (!socket?.connected || !wantsPlayback.current) {
                  instance.pauseVideo();
                  return;
                }
                setAutoplayBlocked(false);
                setNotice("");
                send("PLAYING");
              }
              if (e.data === 2) send("PAUSED");
              if (e.data === 0) send("ENDED");
            },
            onError: (event: { data: number }) => {
              if (cancelled) return;
              clearTimeout(readyTimer);
              wantsPlayback.current = false;
              setAutoplayBlocked(false);
              setNotice(youtubeErrorMessage(event.data, location.hostname));
              send("ERROR");
            },
          },
        });
        player.current = instance;
        readyTimer = setTimeout(() => {
          if (!cancelled) {
            setNotice(
              "O vídeo não ficou pronto. O anfitrião pode cancelar por falha e tentar outro.",
            );
            send("ERROR");
          }
        }, 15000);
      })
      .catch((e) => {
        if (!cancelled) {
          setNotice(e.message);
          send("ERROR");
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      instance?.destroy();
      player.current = null;
      playerReady.current = false;
    };
  }, [perfId, demo]);
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
      player.current?.playVideo();
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
      } else if (c.action === "PAUSE") player.current?.pauseVideo();
      else if (playerReady.current) player.current?.playVideo();
    };
    const disconnected = () => {
      wantsPlayback.current = false;
      player.current?.pauseVideo();
    };
    socket?.on("playback.command", command);
    socket?.on("disconnect", disconnected);
    return () => {
      socket?.off("playback.command", command);
      socket?.off("disconnect", disconnected);
    };
  }, [socket, demo]);
  useEffect(() => {
    if (
      ["PAUSED", "RECOVERY", "VOTING", "RESULTS", "CLOSED"].includes(room.state)
    ) {
      wantsPlayback.current = false;
      player.current?.pauseVideo();
    }
  }, [room.state]);
  return (
    <section className="player-area" aria-label="Reprodução do palco">
      {perfId ? (
        <>
          <div className="player-frame" ref={el}>
            {demo && (
              <div className="demo-player">
                <span>🎤</span>
                <h2>Player de demonstração</h2>
                <p>Nenhum vídeo ou áudio real. Simule os eventos abaixo.</p>
              </div>
            )}
          </div>
          <div className="player-actions">
            {autoplayBlocked &&
              ["PREPARING", "PLAYING", "PAUSED"].includes(room.state) && (
                <button
                  disabled={!demo && !ready}
                  onClick={() => {
                    wantsPlayback.current = true;
                    demo ? send("PLAYING") : player.current?.playVideo();
                  }}
                >
                  {autoplayBlocked
                    ? "▶ Ativar som e iniciar"
                    : "▶ Tocar no palco"}
                </button>
              )}
            {demo && room.state === "PLAYING" && (
              <button onClick={() => send("ENDED")}>Simular término</button>
            )}
            {demo &&
              ["PREPARING", "PLAYING", "PAUSED"].includes(room.state) && (
                <button className="quiet" onClick={() => send("ERROR")}>
                  Simular falha
                </button>
              )}
          </div>
        </>
      ) : (
        <div className="stage-welcome">
          <img
            src="/mascot/v3/welcome.png"
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
