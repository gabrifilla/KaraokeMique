import { Icon } from "./Icons";

export function PartyPreview() {
  return (
    <figure
      className="party-preview"
      aria-label="Prévia ilustrativa de uma sala de karaokê"
    >
      <div className="preview-header">
        <span className="preview-room">Sábado com a galera</span>
        <span className="preview-live">
          <i /> A festa tá on
        </span>
      </div>
      <div className="preview-stage">
        <div className="preview-stage-copy">
          <span className="preview-badge">
            <Icon name="mic" /> O palco é seu
          </span>
          <h2>
            Solta a voz,
            <br />
            <em>pede Bis.</em>
          </h2>
          <span className="preview-wave" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${[12, 22, 34, 18, 42, 28, 50, 32, 20][i % 9]}px`,
                }}
              />
            ))}
          </span>
        </div>
        <img
          src="/mascot/v3/welcome.png"
          alt="Mascote microfone pronto para a festa"
        />
        <span className="preview-spark spark-one" aria-hidden="true">
          ✦
        </span>
        <span className="preview-spark spark-two" aria-hidden="true">
          ✦
        </span>
      </div>
      <div className="preview-queue">
        <div className="preview-queue-title">
          <span>Próximas vozes</span>
          <span>Todo mundo tem sua vez</span>
        </div>
        <div className="preview-track">
          <span className="preview-position">01</span>
          <span className="preview-cover">
            <Icon name="music" />
          </span>
          <div>
            <strong>Sua música favorita</strong>
            <small>Você é o próximo!</small>
          </div>
          <span className="preview-turn">Sua vez</span>
        </div>
        <div className="preview-track">
          <span className="preview-position">02</span>
          <span className="preview-cover alternate">
            <Icon name="music" />
          </span>
          <div>
            <strong>Mais um hit da noite</strong>
            <small>Marina</small>
          </div>
          <span className="preview-duration">Na fila</span>
        </div>
      </div>
      <div className="preview-reactions" aria-label="Reações ilustrativas">
        <span>👏</span>
        <span>🔥</span>
        <span>💜</span>
        <span>🎉</span>
        <p>
          Quem assiste também
          <br />
          faz parte do show.
        </p>
      </div>
      <figcaption>
        Prévia ilustrativa · a sua sala vai ter a cara da sua galera.
      </figcaption>
    </figure>
  );
}
