import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api, commandId } from "./api";
import { Brand } from "./Branding";

export function TvSetup() {
  const started = useRef<Promise<any> | undefined>(undefined);
  const [pairing, setPairing] = useState<any>();
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(300);
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false,
      pending = false;
    started.current ??= api("/tv-pairing", {});
    void started.current
      .then((p) => {
        if (!cancelled) setPairing(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    const timer = setInterval(async () => {
      if (!pairing || cancelled || pending) return;
      setRemaining(
        Math.max(0, Math.ceil((pairing.expiresAt - Date.now()) / 1000)),
      );
      pending = true;
      try {
        const result = await api("/tv-pairing/status", { id: pairing.id });
        if (!cancelled && result.state === "PAIRED")
          navigate(`/stage/${result.roomId}`, { replace: true });
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          clearInterval(timer);
        }
      } finally {
        pending = false;
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pairing?.id]);
  const url = pairing
    ? `${location.origin}/connect-tv?code=${pairing.code}`
    : "";
  return (
    <main className="tv-setup narrow">
      <Brand />
      <section className="card">
        <p className="eyebrow">ESTA TELA VAI SER O PALCO</p>
        <h1>Conecte pelo celular</h1>
        <p>
          O anfitrião escaneia o QR e escolhe a sala. Não precisa digitar nada
          na TV.
        </p>
        {pairing && (
          <>
            <div className="tv-qr">
              <QRCodeSVG value={url} size={220} marginSize={3} />
            </div>
            <p>
              Ou, na sala do celular, toque em <strong>Palco</strong> e informe:
            </p>
            <strong className="tv-code">{pairing.code}</strong>
            <small>
              Válido por {Math.ceil(remaining / 60)} min · aguardando
              autorização do anfitrião
            </small>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {error && (
          <button onClick={() => location.reload()}>Gerar outro código</button>
        )}
        <Link to="/stage/pair">Usar um código autorizado</Link>
      </section>
    </main>
  );
}

export function ApproveTv() {
  const code = new URLSearchParams(location.search).get("code") || "";
  const [rooms, setRooms] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    void api("/hosted-rooms")
      .then((r) => {
        if (!cancelled) setRooms(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <main className="narrow">
      <section className="card">
        <p className="eyebrow">AUTORIZAR A TV</p>
        <h1>Qual sala vai para a TV?</h1>
        <p>
          Confirme se a TV mostra o código <strong>{code}</strong>.
        </p>
        {rooms.map((room) => (
          <button
            key={room.id}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/rooms/${room.id}/connect-tv`, { code });
                navigate(`/r/${room.id}`);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Conectar à sala {room.name} · {room.code}
          </button>
        ))}
        {!rooms.length && (
          <p>
            Abra este link no navegador em que você criou sua sala ou crie uma
            sala agora.
          </p>
        )}
        <Link
          className="button secondary"
          to={`/rooms/new?tv=${encodeURIComponent(code)}`}
        >
          Criar sala e conectar TV
        </Link>
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}

export function StageSetup({
  id,
  roomCode,
  development,
}: {
  id: string;
  roomCode: string;
  development: boolean;
}) {
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get("tv") || "",
  );
  const [pairCode, setPairCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const navigate = useNavigate();
  async function openHere() {
    setBusy(true);
    setError("");
    try {
      const p = await api(`/rooms/${id}/commands`, {
        kind: "PAIR",
        commandId: commandId(),
        payload: {},
      });
      const r = await api("/pairing/redeem", { code: p.code });
      navigate(`/stage/${r.roomId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card stage-setup">
      <p className="eyebrow">PALCO E TV</p>
      <h2>Onde a galera vai cantar?</h2>
      <button disabled={busy} onClick={() => void openHere()}>
        Usar esta tela como palco
      </button>
      <h3>Conectar uma TV pelo celular</h3>
      <p>
        Na TV, abra o início do Karaoke Míque e escolha{" "}
        <strong>Usar como palco</strong>. Escaneie o QR da TV ou informe o
        código abaixo.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(`/rooms/${id}/connect-tv`, { code });
            setFeedback("TV autorizada! Ela abrirá o palco automaticamente.");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Código de 6 dígitos da TV
          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
        </label>
        <button disabled={busy}>Conectar TV</button>
      </form>
      <Link to="/stage/tv" target="_blank">
        Abrir modo TV em outra aba
      </Link>
      <details>
        <summary>Outras formas de conectar</summary>
        <p>
          Código autorizado: válido por dois minutos, uso único. Substitui o
          palco anterior.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const p = await api(`/rooms/${id}/commands`, {
                kind: "PAIR",
                commandId: commandId(),
                payload: {},
              });
              setPairCode(p.code);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Autorizar palco
        </button>
        {pairCode && (
          <>
            <code className="pair-code">{pairCode}</code>
            <Link to="/stage/pair">Digitar código autorizado no palco</Link>
          </>
        )}
        {development && (
          <p>
            Desenvolvimento:{" "}
            <a
              href={`/stage/pair?roomCode=${roomCode}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir palco de desenvolvimento
            </a>{" "}
            e usar qualquer código não vazio.
          </p>
        )}
      </details>
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
