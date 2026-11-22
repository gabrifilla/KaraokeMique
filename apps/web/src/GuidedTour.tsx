import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "./guided-tour.css";
import { PushSetup } from "./PushSetup";

type Mood =
  | "welcome"
  | "step-1"
  | "step-2"
  | "step-3"
  | "encouraging"
  | "groove"
  | "celebration";
/** Como o Míque se mexe ao chegar no passo. */
type Move = "wave" | "hop" | "spin" | "dance" | "peek";

export interface TourStep {
  id: string;
  mood: Mood;
  move: Move;
  title: string;
  /** Conteúdo do balão; como função, pode fazer o Míque comemorar. */
  body: ReactNode | ((ctx: { celebrate: () => void }) => ReactNode);
  /** Seletor do elemento destacado; sem ele, o balão fica centralizado. */
  target?: string;
  /** Rota aberta antes de mostrar o passo. */
  path?: string;
  /** Passo "experimente": o destaque fica clicável e o Míque comemora. */
  tryIt?: { done: ReactNode };
  confetti?: boolean;
}

export type TourRole = "host" | "guest";

const storageKey = (role: TourRole) => `karaoke.tour.v1.${role}`;
export function tourSeen(role: TourRole) {
  // Navegadores automatizados (testes) não recebem o tour sem pedir.
  if (navigator.webdriver) return true;
  try {
    return localStorage.getItem(storageKey(role)) === "done";
  } catch {
    return true; // Sem armazenamento, não insiste em abrir sozinho.
  }
}
function markSeen(role: TourRole) {
  try {
    localStorage.setItem(storageKey(role), "done");
  } catch {
    /* modo privado: tudo bem */
  }
}

/** Frases do Míque quando alguém cutuca o mascote. */
const pokes = [
  "Ei! Isso faz cócegas! 😆",
  "Tô afinadíssimo hoje! 🎶",
  "Lá-lá-láááá! 🎤",
  "Cuidado, sou sensível… ao som! 🔊",
  "Bora cantar? Bora cantar! 🕺",
  "Microfone ligado, coração também 💜",
];

export function tourSteps(
  role: TourRole,
  base: string,
  { tvOn = false } = {},
): TourStep[] {
  // Tour curto: só o essencial do primeiro minuto. O resto o Míque explica
  // na hora em que acontece (dicas em MiqueTips).
  const host = role === "host";
  const roomId = base.split("/").pop() || "";
  const hello: TourStep = {
    id: "oi",
    mood: "welcome",
    move: "wave",
    title: "E aí! Eu sou o Míque 🎤",
    path: base,
    target: ".action-card",
    body: (
      <>
        <p>
          O microfone mais animado da festa! Este cartão sempre mostra{" "}
          <strong>o que fazer agora</strong>: escolher música, quanto falta pra
          sua vez e a hora de votar. Na dúvida, olha pra ele!
        </p>
        <p className="tour-hint">Psiu: pode me cutucar 👈</p>
      </>
    ),
  };
  const alerts = (finale: boolean): TourStep => ({
    id: "avisos",
    mood: finale ? "celebration" : "encouraging",
    move: finale ? "dance" : "hop",
    title: "Posso te chamar? 🔔",
    confetti: finale,
    body: ({ celebrate }) => (
      <>
        <p>
          Pode bloquear o celular: sua música não sai da fila. Se deixar, eu te
          aviso quando você for o próximo, quando for sua vez e na hora de
          votar.
        </p>
        <PushSetup roomId={roomId} onEnabled={celebrate} />
        {finale && (
          <p>
            <strong>Palco</strong> e <strong>Gerenciar</strong> ficam aqui
            embaixo quando precisar. O resto eu vou te mostrando na hora! 😉
          </p>
        )}
      </>
    ),
  });
  const done: TourStep = {
    id: "pronto",
    mood: "celebration",
    move: "dance",
    title: "Prontinho! Bora cantar 🎉",
    target: '[data-tour="help"]',
    confetti: true,
    body: (
      <p>
        O resto eu vou te mostrando na hora. Esqueceu algo? Toque em{" "}
        <strong>Tutorial</strong>. Letra pequena? Toque em <strong>Aa</strong>.
      </p>
    ),
  };
  if (!host) return [hello, alerts(false), done];
  const tv: TourStep | undefined = tvOn
    ? undefined
    : {
        id: "tv",
        mood: "step-1",
        move: "hop",
        title: "Bora pra telona! 📺",
        path: `${base}/stage`,
        target: '[data-tour="tv"]',
        body: (
          <ol>
            <li>
              Na TV, abra este mesmo site e toque em{" "}
              <strong>Usar como palco</strong>.
            </li>
            <li>
              Aponte a câmera deste celular para o QR da TV. Ela liga sozinha,
              num passe de mágica ✨
            </li>
            <li>
              Sem câmera? Digite aqui o número da TV e toque em{" "}
              <strong>Ligar a TV</strong>.
            </li>
          </ol>
        ),
      };
  const invite: TourStep = {
    id: "galera",
    mood: "step-2",
    move: "wave",
    title: "Chama a galera!",
    path: base,
    target: "[data-room-code]",
    body: (
      <p>
        Seus amigos entram apontando a câmera pro <strong>QR da TV</strong>.
        Quem não tiver câmera digita este código em{" "}
        <strong>Tenho um código</strong>.
      </p>
    ),
  };
  return [hello, ...(tv ? [tv] : []), invite, alerts(true)];
}

type Box = { top: number; left: number; width: number; height: number };
const PAD = 8;

export function GuidedTour({
  steps,
  role,
  onClose,
}: {
  steps: TourStep[];
  role: TourRole;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [tried, setTried] = useState(false);
  const [poke, setPoke] = useState<{ text: string; n: number }>();
  const card = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const step = steps[index];
  const last = index === steps.length - 1;

  const close = useCallback(() => {
    markSeen(role);
    onClose();
  }, [role, onClose]);

  useEffect(() => {
    setTried(false);
    setPoke(undefined);
  }, [index]);
  useEffect(() => {
    if (!poke) return;
    const t = setTimeout(() => setPoke(undefined), 2400);
    return () => clearTimeout(t);
  }, [poke]);

  // Abre a aba do passo, espera o alvo aparecer e acompanha sua posição
  // (seções que abrem/fecham e a rolagem mudam o layout depois do clique).
  useLayoutEffect(() => {
    setBox(null);
    if (step.path && location.pathname !== step.path) navigate(step.path);
    if (!step.target) return;
    let frame = 0;
    let tries = 0;
    let scrolledAt = 0;
    let element: Element | null = null;
    let listening: Element | null = null;
    let last = "";
    const onTry = () => setTried(true);
    const track = () => {
      element = element?.isConnected
        ? element
        : document.querySelector(step.target!);
      if (element) {
        if (step.tryIt && listening !== element) {
          listening?.removeEventListener("click", onTry);
          element.addEventListener("click", onTry);
          listening = element;
        }
        const r = element.getBoundingClientRect();
        // Recentraliza enquanto o layout se acomoda nos primeiros quadros.
        if (scrolledAt++ < 20 && (r.top < 0 || r.bottom > window.innerHeight))
          element.scrollIntoView({ block: "center", behavior: "instant" });
        const next = {
          top: r.top - PAD,
          left: r.left - PAD,
          width: r.width + PAD * 2,
          height: r.height + PAD * 2,
        };
        const key = JSON.stringify(next);
        if (key !== last) {
          last = key;
          setBox(next);
        }
      } else if (tries++ > 90) return; // Alvo ausente: balão centralizado.
      frame = requestAnimationFrame(track);
    };
    track();
    return () => {
      cancelAnimationFrame(frame);
      listening?.removeEventListener("click", onTry);
    };
  }, [step, navigate]);

  useEffect(() => {
    card.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" && !last) setIndex((i) => i + 1);
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [close, last]);

  // Balão no lado oposto ao destaque, para não cobrir o que está sendo mostrado.
  const placement = !box
    ? "center"
    : box.top > window.innerHeight - (box.top + box.height)
      ? "top"
      : "bottom";
  const celebrating = tried || !!poke;
  const mood = tried ? "celebration" : step.mood;
  // Passo "experimente": só a área destacada aceita toques; o resto fica
  // bloqueado por quatro faixas em volta dela.
  const hole = step.tryIt && box;

  return (
    <div className="tour" role="presentation">
      {box ? (
        <div
          className="tour-spotlight"
          data-try={!!step.tryIt && !tried}
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        />
      ) : (
        <div className="tour-dim" />
      )}
      {hole ? (
        <>
          <div
            className="tour-block"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, box.top) }}
          />
          <div
            className="tour-block"
            style={{ top: box.top + box.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="tour-block"
            style={{
              top: box.top,
              left: 0,
              width: Math.max(0, box.left),
              height: box.height,
            }}
          />
          <div
            className="tour-block"
            style={{
              top: box.top,
              left: box.left + box.width,
              right: 0,
              height: box.height,
            }}
          />
        </>
      ) : (
        <div className="tour-block" style={{ inset: 0 }} />
      )}
      {step.confetti && (
        <div className="tour-confetti" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              style={
                {
                  "--x": `${(i * 37) % 100}%`,
                  "--d": `${(i % 7) * 0.18}s`,
                  "--r": `${(i * 53) % 360}deg`,
                } as CSSProperties
              }
            >
              {["🎉", "🎤", "⭐", "🎶", "💜", "✨"][i % 6]}
            </span>
          ))}
        </div>
      )}
      <div
        ref={card}
        className="tour-card"
        data-placement={placement}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        {poke && (
          <span className="tour-poke" role="status">
            {poke.text}
          </span>
        )}
        <button
          type="button"
          className="tour-mascot-button"
          aria-label="Cutucar o Míque"
          onClick={() =>
            setPoke((p) => {
              const n =
                ((p?.n ?? Math.floor(Math.random() * pokes.length)) + 1) %
                pokes.length;
              return { text: pokes[n], n };
            })
          }
        >
          <img
            key={`${index}-${mood}-${poke?.n ?? ""}`}
            className="tour-mascot"
            data-move={celebrating ? "spin" : step.move}
            src={`/mascot/v3/${mood}.webp`}
            alt=""
          />
        </button>
        <div className="tour-bubble" key={index}>
          <p className="tour-count">
            Passo {index + 1} de {steps.length}
          </p>
          <h2 id="tour-title">{step.title}</h2>
          <div id="tour-body" aria-live="polite">
            {tried && step.tryIt
              ? step.tryIt.done
              : typeof step.body === "function"
                ? step.body({ celebrate: () => setTried(true) })
                : step.body}
          </div>
          <div className="tour-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <i key={s.id} data-active={i === index} />
            ))}
          </div>
          <div className="tour-actions">
            {!last && (
              <button className="quiet tour-skip" onClick={close}>
                Pular
              </button>
            )}
            {index > 0 && (
              <button className="quiet" onClick={() => setIndex(index - 1)}>
                Voltar
              </button>
            )}
            <button
              data-ready={tried}
              onClick={() => (last ? close() : setIndex(index + 1))}
              autoFocus
            >
              {last ? "Bora cantar!" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
