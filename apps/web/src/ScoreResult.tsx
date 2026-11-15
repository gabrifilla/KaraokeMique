import { useEffect, useState } from "react";
import type { PublicPerformance } from "../../../packages/contracts/src/index.js";
import {
  animatedScore,
  scoreFeedback,
  SCORE_REVEAL_MS,
  NO_SCORE_REVEAL_MS,
} from "./score-feedback";
import { playScoreSound } from "./score-audio";

const format = (value: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const descriptions = {
  confused: "Mascote confuso, perguntando por que ninguém votou",
  encouraging: "Mascote sorrindo e dando um sinal de incentivo",
  groove: "Mascote feliz, dançando",
  celebration: "Mascote comemorando com as mãos para cima",
};

export function ScoreResult({
  performance,
  singer,
  song,
  animate,
  serverNow,
  sound,
}: {
  performance: PublicPerformance;
  singer: string;
  song: string;
  animate: boolean;
  serverNow: number;
  sound: boolean;
}) {
  const average = performance.round?.average ?? null;
  const closedAt = performance.round?.closedAt || 0;
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const duration = reducedMotion
    ? 0
    : average === null
      ? NO_SCORE_REVEAL_MS
      : SCORE_REVEAL_MS;
  const [elapsed, setElapsed] = useState(() =>
    animate ? Math.max(0, serverNow - closedAt) : Infinity,
  );
  const revealed = !animate || elapsed >= duration;
  const feedback = scoreFeedback(average, performance.id);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(query.matches);
    if (query.addEventListener) query.addEventListener("change", change);
    else query.addListener(change);
    return () => {
      if (query.removeEventListener)
        query.removeEventListener("change", change);
      else query.removeListener(change);
    };
  }, []);
  useEffect(() => {
    if (!animate || duration === 0) return;
    const offset = serverNow - Date.now();
    let frame = 0;
    const tick = () => {
      const passed = Math.max(0, Date.now() + offset - closedAt);
      setElapsed(passed);
      if (passed < duration) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [performance.id, closedAt, animate, duration]);
  useEffect(() => {
    const passed = Math.max(0, serverNow - closedAt);
    // Historical/reloaded results never replay an old cue. Visuals never wait for audio permission.
    if (
      !animate ||
      !sound ||
      (duration > 0 && passed >= duration) ||
      (duration === 0 && passed > 1000)
    )
      return;
    return playScoreSound(
      duration === 0 ? 0 : passed,
      duration,
      average === null,
      reducedMotion,
    );
  }, [performance.id, closedAt, animate, sound, duration]);
  return (
    <section
      className="result card score-result"
      data-phase={revealed ? "revealed" : "revealing"}
      data-mood={revealed ? feedback.mood : "suspense"}
      aria-label={`Resultado de ${singer}`}
    >
      <p className="result-intro">
        {singer} cantou <span>{song}</span>
      </p>
      <div className="score-scene">
        <strong
          className={`result-score${average === null ? " no-score" : ""}`}
          aria-hidden="true"
        >
          {average === null
            ? revealed
              ? "Sem notas"
              : "…"
            : format(revealed ? average : animatedScore(average, elapsed))}
        </strong>
        <div
          className={`result-mascot mascot-${revealed ? feedback.mood : "encouraging"}`}
          role="img"
          aria-label={descriptions[revealed ? feedback.mood : "encouraging"]}
        />
      </div>
      <p className="result-phrase">
        {revealed ? feedback.phrase : "Segura o microfone… a nota tá chegando!"}
      </p>
      <span className="score-sr-only" role="status">
        {revealed
          ? `${average === null ? "Sem notas nesta apresentação" : `Nota final: ${format(average)}`}. ${feedback.phrase}`
          : "Revelando o resultado da apresentação"}
      </span>
      {performance.round?.reason === "ROOM_CLOSED" && (
        <small>Finalizada pelo encerramento da sala</small>
      )}
    </section>
  );
}
