/**
 * Regras do player do palco para os estados do YouTube. Ficam separadas para
 * poder testar o comportamento do iPhone/iPad, onde o Safari:
 *  - bloqueia em silêncio o play com som que não veio de um toque na tela
 *    (o vídeo entra em "tocando" e pausa logo em seguida, sem aviso);
 *  - só libera o som quando a pessoa toca no próprio vídeo.
 */
export const YT_ENDED = 0;
export const YT_PLAYING = 1;
export const YT_PAUSED = 2;

/** Janela em que uma pausa logo após nosso play conta como bloqueio do navegador. */
export const BLOCK_WINDOW_MS = 4000;
/** Janela em que uma pausa conta como pedida por nós (comando do anfitrião). */
export const OWN_PAUSE_WINDOW_MS = 3000;

const PLAYABLE = ["PREPARING", "PLAYING", "PAUSED"];

export interface PlayerContext {
  roomState: string;
  connected: boolean;
  now: number;
  /** Quando pedimos play por código (sem toque da pessoa). */
  playRequestedAt: number;
  /** Quando pedimos pausa por código. */
  pauseRequestedAt: number;
}

export type PlayerAction =
  | { kind: "report"; event: "PLAYING" | "PAUSED" | "ENDED" }
  | { kind: "pause" }
  | { kind: "blocked" }
  | { kind: "none" };

export function onPlayerState(state: number, ctx: PlayerContext): PlayerAction {
  if (state === YT_PLAYING) {
    // Antes o player pausava sempre que a sala estava em PAUSED. No iPhone isso
    // virava um ciclo: o Safari bloqueava o play automático (→ PAUSED) e, quando
    // a pessoa tocava no vídeo para liberar o som, o próprio app pausava de novo.
    // Agora, tocar no vídeo do palco durante a apresentação retoma a música.
    if (ctx.connected && PLAYABLE.includes(ctx.roomState))
      return { kind: "report", event: "PLAYING" };
    return { kind: "pause" };
  }
  if (state === YT_PAUSED) {
    if (ctx.now - ctx.pauseRequestedAt < OWN_PAUSE_WINDOW_MS)
      return { kind: "report", event: "PAUSED" };
    // Pausou sozinho logo depois do nosso play: o navegador bloqueou o som.
    // Não avisa "pausado" à sala; pede um toque na tela do palco.
    if (ctx.now - ctx.playRequestedAt < BLOCK_WINDOW_MS)
      return { kind: "blocked" };
    return { kind: "report", event: "PAUSED" };
  }
  if (state === YT_ENDED) return { kind: "report", event: "ENDED" };
  return { kind: "none" };
}

export const isAppleTouch = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
