/**
 * Avisos táteis e sonoros quando é a vez da pessoa, quando ela é a próxima e
 * quando a votação abre.
 *
 * - Android: navigator.vibrate.
 * - iPhone: o Safari não tem navigator.vibrate. A partir do iOS 17.4/18, alternar
 *   um <input type="checkbox" switch> dispara o toque tátil do sistema; usamos
 *   isso como "vibração". É um efeito colateral do Safari e pode deixar de
 *   funcionar em versões futuras, por isso também tocamos um som curto.
 * - Som: precisa de um primeiro toque na tela para ser liberado (regra dos
 *   navegadores); liberamos no primeiro toque em qualquer lugar do app.
 * Com a tela bloqueada nada disso roda: aí valem as notificações push.
 */
type AlertKind = "turn" | "next" | "vote";

let audio: AudioContext | undefined;
function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    void audio.resume();
  } catch {
    /* sem áudio neste navegador */
  }
}
if (typeof window !== "undefined")
  window.addEventListener("pointerdown", unlockAudio, { passive: true });

function chime(kind: AlertKind) {
  if (!audio || audio.state !== "running") return;
  // Som gerado num buffer (sem oscilador): curto, "ding-ding" de aviso.
  const notes = kind === "turn" ? [660, 880, 1320] : [660, 880];
  const rate = audio.sampleRate;
  const step = 0.16;
  const length = Math.ceil(rate * (step * notes.length + 0.3));
  const buffer = audio.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  notes.forEach((freq, n) => {
    const offset = Math.floor(n * step * rate);
    const span = Math.floor(0.3 * rate);
    for (let i = 0; i < span && offset + i < length; i++) {
      const t = i / rate;
      const envelope = Math.min(1, t / 0.02) * Math.exp(-t * 12);
      data[offset + i] += 0.25 * envelope * Math.sin(2 * Math.PI * freq * t);
    }
  });
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  source.start();
}

let switchLabel: HTMLLabelElement | undefined;
function iosTap() {
  if (!switchLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-10px;top:-10px";
    label.append(input);
    document.body.append(label);
    switchLabel = label;
  }
  switchLabel.click();
}

export function alertFeedback(kind: AlertKind) {
  const pattern = kind === "turn" ? [400, 150, 400, 150, 400] : [200, 100, 200];
  let vibrated = false;
  try {
    vibrated = !!navigator.vibrate?.(pattern);
  } catch {
    vibrated = false;
  }
  if (!vibrated) {
    // iPhone: um toque tátil por "pulso" do padrão.
    const pulses = Math.ceil(pattern.length / 2);
    for (let i = 0; i < pulses; i++)
      setTimeout(() => {
        try {
          iosTap();
        } catch {
          /* sem toque tátil */
        }
      }, i * 250);
  }
  chime(kind);
}
