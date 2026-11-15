import { useEffect, useState } from "react";

let context: AudioContext | undefined;
function audioContext() {
  const Constructor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Constructor) return;
  return (context ??= new Constructor());
}
export function useStageScoreAudio(stage: boolean) {
  const [ready, setReady] = useState(false);
  async function unlock() {
    if (!stage) return;
    try {
      const ctx = audioContext();
      if (!ctx) return;
      await ctx.resume();
      setReady(ctx.state === "running");
    } catch {
      setReady(false);
    }
  }
  useEffect(() => {
    if (!stage) return;
    const gesture = (event?: Event) => {
      if ((event?.target as Element | null)?.closest?.("[data-score-audio]"))
        return;
      void unlock();
    };
    document.addEventListener("pointerdown", gesture);
    document.addEventListener("keydown", gesture);
    gesture();
    return () => {
      document.removeEventListener("pointerdown", gesture);
      document.removeEventListener("keydown", gesture);
    };
  }, [stage]);
  return {
    enabled: stage,
    ready,
  };
}

// Original synthesized UI cue. A dedicated gain bus keeps it below music volume.
export function playScoreSound(
  elapsedMs: number,
  durationMs: number,
  noScore: boolean,
  reducedMotion: boolean,
) {
  if (!context || context.state !== "running") return () => {};
  const ctx = context;
  const bus = ctx.createGain();
  bus.gain.value = 10 ** (-18 / 20);
  bus.connect(ctx.destination);
  const oscillators: OscillatorNode[] = [];
  const now = ctx.currentTime + 0.025;
  function tone(
    atMs: number,
    frequency: number,
    length = 0.1,
    strength = 0.28,
  ) {
    if (atMs < elapsedMs) return;
    const at = now + (atMs - elapsedMs) / 1000;
    const oscillator = ctx.createOscillator(),
      envelope = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(strength, at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillators.push(oscillator);
  }
  if (!reducedMotion && !noScore) {
    for (let n = 0; n < 15; n++) {
      const t = durationMs * (1 - (1 - n / 15) ** 1.65);
      tone(t, 220 * 2 ** (((n % 4) + Math.floor(n / 4) * 2) / 12), 0.075);
    }
  }
  if (noScore) {
    tone(durationMs, 392, 0.16);
    tone(durationMs + 180, 329.63, 0.3);
  } else
    for (const frequency of [261.63, 329.63, 392, 523.25])
      tone(durationMs, frequency, 0.65, 0.2);
  return () => {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.015);
    for (const oscillator of oscillators) {
      try {
        oscillator.stop(ctx.currentTime + 0.06);
      } catch {
        /* Already ended. */
      }
    }
    setTimeout(() => bus.disconnect(), 100);
  };
}
