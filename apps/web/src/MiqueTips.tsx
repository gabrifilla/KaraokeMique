import { useEffect, useState } from "react";
import "./mique-tips.css";

/**
 * Dicas do Míque na hora certa: em vez de explicar tudo no tour, o mascote
 * aparece uma única vez quando a pessoa chega em cada situação (buscar música,
 * primeira música tocando, primeira votação, aba Palco do anfitrião).
 */
export type TipId = "search" | "react" | "vote" | "stage";

const TIPS: Record<TipId, { mood: string; title: string; text: string }> = {
  search: {
    mood: "step-3",
    title: "Achou a música?",
    text: "Um toque em Adicionar e pronto, já tá na fila! Tocou sem querer? Use o Desfazer.",
  },
  react: {
    mood: "groove",
    title: "Alguém tá cantando!",
    text: "Em “Mande energia para o palco”, toque num 👏: ele aparece na TV pra animar quem tá no microfone.",
  },
  vote: {
    mood: "encouraging",
    title: "Hora da nota ⭐",
    text: "Um toque na nota já vota. Mudou de ideia? É só tocar em outra.",
  },
  stage: {
    mood: "groove",
    title: "Sua mesa de som 🎛️",
    text: "Aqui você pausa, pula música e liga a fila automática. A TV fica só com o show.",
  },
};

const key = (id: TipId) => `karaoke.tip.${id}`;
function seen(id: TipId) {
  try {
    return localStorage.getItem(key(id)) === "done";
  } catch {
    return true;
  }
}
function markSeen(id: TipId) {
  try {
    localStorage.setItem(key(id), "done");
  } catch {
    /* modo privado: tudo bem */
  }
}
/** Navegadores automatizados só veem as dicas quando o teste pede. */
function enabled() {
  if (!navigator.webdriver) return true;
  try {
    return localStorage.getItem("karaoke.tips") === "on";
  } catch {
    return false;
  }
}

/** Mostra a primeira dica ainda não vista entre as candidatas (em ordem). */
export function MiqueTip({
  candidates,
  done,
}: {
  candidates: TipId[];
  /** Ação feita: a dica some e conta como vista (ex.: mandou um emoji). */
  done?: TipId[];
}) {
  const [, force] = useState(0);
  const tip = enabled() ? candidates.find((id) => !seen(id)) : undefined;
  useEffect(() => {
    if (!done?.length) return;
    let changed = false;
    for (const id of done)
      if (!seen(id)) {
        markSeen(id);
        changed = true;
      }
    if (changed) force((n) => n + 1);
  }, [done?.join()]);
  if (!tip) return null;
  const t = TIPS[tip];
  return (
    <aside className="mique-tip" role="status" aria-live="polite" key={tip}>
      <img src={`/mascot/v3/${t.mood}.webp`} alt="" />
      <div>
        <strong>{t.title}</strong>
        <p>{t.text}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          markSeen(tip);
          force((n) => n + 1);
        }}
      >
        Entendi
      </button>
    </aside>
  );
}
