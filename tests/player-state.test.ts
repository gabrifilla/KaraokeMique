import { it, expect, describe } from "vitest";
import {
  onPlayerState,
  YT_PLAYING,
  YT_PAUSED,
  YT_ENDED,
  type PlayerContext,
} from "../apps/web/src/player-state";

const base: PlayerContext = {
  roomState: "PREPARING",
  connected: true,
  now: 100000,
  playRequestedAt: 0,
  pauseRequestedAt: 0,
};

describe("player do palco no iPhone", () => {
  it("play automático bloqueado pelo Safari pede toque em vez de pausar a sala", () => {
    // O app pede play por código; o Safari começa e pausa em seguida.
    const ctx = { ...base, playRequestedAt: base.now - 300 };
    expect(onPlayerState(YT_PLAYING, ctx)).toEqual({
      kind: "report",
      event: "PLAYING",
    });
    expect(onPlayerState(YT_PAUSED, { ...ctx, roomState: "PLAYING" })).toEqual({
      kind: "blocked",
    });
  });

  it("tocar no vídeo com a sala pausada retoma, em vez de pausar de novo", () => {
    // Antes: a sala em PAUSED fazia o app pausar o vídeo logo após o toque.
    expect(onPlayerState(YT_PLAYING, { ...base, roomState: "PAUSED" })).toEqual(
      { kind: "report", event: "PLAYING" },
    );
  });

  it("pausa pedida pelo anfitrião é repassada normalmente", () => {
    const ctx = {
      ...base,
      roomState: "PLAYING",
      playRequestedAt: base.now - 1000,
      pauseRequestedAt: base.now - 200,
    };
    expect(onPlayerState(YT_PAUSED, ctx)).toEqual({
      kind: "report",
      event: "PAUSED",
    });
  });

  it("pausa feita no próprio palco, longe do nosso play, vira PAUSED", () => {
    const ctx = {
      ...base,
      roomState: "PLAYING",
      playRequestedAt: base.now - 60000,
    };
    expect(onPlayerState(YT_PAUSED, ctx)).toEqual({
      kind: "report",
      event: "PAUSED",
    });
  });

  it("não toca fora da apresentação nem sem conexão", () => {
    for (const roomState of ["VOTING", "RESULTS", "RECOVERY", "CLOSED"])
      expect(onPlayerState(YT_PLAYING, { ...base, roomState })).toEqual({
        kind: "pause",
      });
    expect(onPlayerState(YT_PLAYING, { ...base, connected: false })).toEqual({
      kind: "pause",
    });
  });

  it("fim do vídeo é informado", () => {
    expect(onPlayerState(YT_ENDED, base)).toEqual({
      kind: "report",
      event: "ENDED",
    });
  });
});
