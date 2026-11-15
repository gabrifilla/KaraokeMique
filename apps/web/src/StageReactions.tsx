import { type CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface StageReaction {
  id: string;
  type: "EMOJI" | "GIF";
  value: string;
  expiresAt: number;
  url?: string;
  fallbackUrl?: string;
  title?: string;
  senderName?: string;
  motion: {
    x: number;
    y: number;
    drift: number;
    spin: number;
    size: number;
    duration: number;
  };
}

// A trajetória é escolhida no recebimento, não a cada atualização do relógio.
export function stageReaction(
  reaction: Omit<StageReaction, "motion">,
  now: number,
): StageReaction {
  return {
    ...reaction,
    motion: {
      x: 7 + Math.random() * 84,
      y: 28 + Math.random() * 39,
      drift: -36 + Math.random() * 72,
      spin: -24 + Math.random() * 48,
      size: 40 + Math.random() * 22,
      duration: Math.min(4600, Math.max(1, reaction.expiresAt - now)),
    },
  };
}

export function EmojiRain({
  reactions,
  hidden,
}: {
  reactions: StageReaction[];
  hidden: boolean;
}) {
  return (
    <div className="emoji-overlay" aria-hidden="true">
      {!hidden &&
        reactions
          .filter((r) => r.type === "EMOJI")
          .map((r) => (
            <span
              key={r.id}
              className="emoji-drop"
              data-reaction-id={r.id}
              style={
                {
                  left: `${r.motion.x}%`,
                  top: `${r.motion.y}%`,
                  fontSize: `${r.motion.size}px`,
                  animationDuration: `${r.motion.duration}ms`,
                  "--drift": `${r.motion.drift}px`,
                  "--spin": `${r.motion.spin}deg`,
                } as CSSProperties
              }
            >
              {r.value}
            </span>
          ))}
    </div>
  );
}

export function GifSpotlight({
  reactions,
  hidden,
  display = "normal",
}: {
  reactions: StageReaction[];
  hidden: boolean;
  display?: "normal" | "expanded" | "minimized";
}) {
  const gif = hidden
    ? undefined
    : reactions.filter((r) => r.type === "GIF").at(-1);
  if (!gif) return null;
  const image = (
    <img
      key={gif.id}
      src={gif.url}
      alt={gif.title || "GIF de reação"}
      onError={(e) => {
        if (gif.fallbackUrl && e.currentTarget.src !== gif.fallbackUrl)
          e.currentTarget.src = gif.fallbackUrl;
      }}
    />
  );
  return (
    <section className="gif-spotlight has-gif" aria-label="GIFs da galera">
      <p className="gif-caption">Da galera</p>
      <div className="gif-spotlight-media" hidden={display === "minimized"}>
        {image}
      </div>
      <p className="gif-sender">
        Enviado por {gif.senderName || "Participante"}
      </p>
      <small>Powered By GIPHY</small>
      {display === "expanded" &&
        document.querySelector(".stage-main") &&
        createPortal(
          <div className="gif-focus" role="region" aria-label="GIF ampliado">
            <div className="gif-focus-media">{image}</div>
            <p>Enviado por {gif.senderName || "Participante"}</p>
            <small>Powered By GIPHY</small>
          </div>,
          document.querySelector(".stage-main")!,
        )}
    </section>
  );
}
