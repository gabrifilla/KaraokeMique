import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "./guided-tour.css";

type Mood =
  | "welcome"
  | "step-1"
  | "step-2"
  | "step-3"
  | "encouraging"
  | "groove"
  | "celebration";

export interface TourStep {
  id: string;
  mood: Mood;
  title: string;
  body: ReactNode;
  /** Seletor do elemento destacado; sem ele, o balão fica centralizado. */
  target?: string;
  /** Rota aberta antes de mostrar o passo. */
  path?: string;
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

export function tourSteps(role: TourRole, base: string): TourStep[] {
  const welcome: TourStep = {
    id: "oi",
    mood: "welcome",
    title: "Oi! Eu sou o Míque 🎤",
    body:
      role === "host" ? (
        <p>
          Você é o <strong>anfitrião</strong> desta sala. Em menos de um minuto
          eu te mostro como deixar a festa pronta.
        </p>
      ) : (
        <p>
          Bem-vindo à festa! Vou te mostrar rapidinho como pedir sua música,
          mandar reações e dar nota pra galera.
        </p>
      ),
  };
  const search: TourStep = {
    id: "buscar",
    mood: "step-3",
    title: "Escolha sua música",
    path: `${base}/search`,
    target: '[data-tour="search"]',
    body: (
      <p>
        Busque pelo nome da música ou do artista (não precisa escrever
        “karaoke”). Toque em <strong>Adicionar</strong> e depois em{" "}
        <strong>Confirmar</strong> para entrar na fila.
      </p>
    ),
  };
  const reactions: TourStep = {
    id: "reagir",
    mood: "groove",
    title: "Mande energia pro palco",
    path: base,
    target: '[data-tour="reactions"]',
    body: (
      <p>
        Enquanto alguém canta, toque nos emojis para eles aparecerem na TV. Cada
        pessoa também pode mandar até <strong>2 GIFs por música</strong>.
      </p>
    ),
  };
  const voting: TourStep = {
    id: "votar",
    mood: "encouraging",
    title: "Hora da nota",
    body: (
      <p>
        Nos <strong>últimos 20 segundos</strong> da música a votação abre aqui
        no celular e fica aberta até 10 segundos depois do fim. Dê uma nota de 0
        a 10. Se todo mundo der 10, quem cantou ganha um <strong>bis</strong>!
      </p>
    ),
  };
  const done: TourStep = {
    id: "pronto",
    mood: "celebration",
    title: "Agora é com você!",
    target: '[data-tour="help"]',
    body: (
      <p>
        Pra rever este tour quando quiser, toque no botão{" "}
        <strong>Tutorial</strong> aqui em cima. Letra pequena? Toque em{" "}
        <strong>Aa</strong> para aumentar. Bora soltar a voz!
      </p>
    ),
  };
  if (role === "guest")
    return [
      welcome,
      search,
      {
        id: "fila",
        mood: "step-2",
        title: "Acompanhe seus pedidos",
        path: base,
        target: '[data-tour="nav-queue"]',
        body: (
          <p>
            Em <strong>Minhas músicas</strong> você vê e remove seus pedidos. A
            ordem da fila aparece na TV: quem cantou menos canta antes.
          </p>
        ),
      },
      reactions,
      voting,
      {
        id: "bloquear",
        mood: "welcome",
        title: "Pode bloquear o celular",
        body: (
          <p>
            Sua música continua na fila mesmo com a tela bloqueada. Quando
            chegar sua vez, é só pegar o microfone!
          </p>
        ),
      },
      done,
    ];
  return [
    welcome,
    {
      id: "codigo",
      mood: "step-2",
      title: "O código da sua sala",
      path: base,
      target: "[data-room-code]",
      body: (
        <p>
          A galera entra pelo <strong>QR code</strong> que aparece na TV ou
          digitando este código em <strong>Tenho um código</strong>.
        </p>
      ),
    },
    {
      id: "tv",
      mood: "step-1",
      title: "Coloque a festa na TV",
      path: `${base}/stage`,
      target: '[data-tour="tv"]',
      body: (
        <ol>
          <li>
            Na TV ou no computador, abra este mesmo site e escolha{" "}
            <strong>Usar como palco</strong>.
          </li>
          <li>
            Aponte a câmera deste celular para o QR da TV. Pronto: ela liga
            sozinha.
          </li>
          <li>
            Sem câmera? Digite aqui o número da TV e toque em{" "}
            <strong>Ligar a TV</strong>.
          </li>
        </ol>
      ),
    },
    {
      id: "controles",
      mood: "groove",
      title: "Você comanda o palco",
      path: `${base}/stage`,
      target: '[data-tour="stage-controls"]',
      body: (
        <p>
          Daqui você liga a <strong>fila automática</strong>, pausa, pula
          músicas e decide se a TV mostra reações e GIFs. A TV fica só com o
          show.
        </p>
      ),
    },
    search,
    reactions,
    voting,
    {
      id: "gerenciar",
      mood: "step-3",
      title: "Cuide da galera",
      path: base,
      target: '[data-tour="nav-people"]',
      body: (
        <p>
          Em <strong>Gerenciar</strong> você libera ou fecha novas entradas,
          remove alguém, passa o comando ou encerra a sala no fim da festa.
        </p>
      ),
    },
    done,
  ];
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
  const card = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const step = steps[index];
  const last = index === steps.length - 1;

  const close = useCallback(() => {
    markSeen(role);
    onClose();
  }, [role, onClose]);

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
    let last = "";
    const track = () => {
      element = element?.isConnected
        ? element
        : document.querySelector(step.target!);
      if (element) {
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
    return () => cancelAnimationFrame(frame);
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

  return (
    <div className="tour" role="presentation">
      {box ? (
        <div
          className="tour-spotlight"
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
        <img
          key={step.mood}
          className="tour-mascot"
          src={`/mascot/v3/${step.mood}.webp`}
          alt=""
        />
        <div className="tour-bubble">
          <p className="tour-count">
            Passo {index + 1} de {steps.length}
          </p>
          <h2 id="tour-title">{step.title}</h2>
          <div id="tour-body" aria-live="polite">
            {step.body}
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
