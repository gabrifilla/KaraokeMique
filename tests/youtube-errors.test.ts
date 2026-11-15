import { expect, it } from "vitest";
import { youtubeErrorMessage } from "../apps/web/src/youtube-errors.js";

it("distingue recusa de embed em IP de vídeo removido e de falha de identificação", () => {
  expect(youtubeErrorMessage(150, "192.168.0.122")).toContain("acessar por IP");
  expect(youtubeErrorMessage(101, "[::1]")).toContain("endereço com nome");
  expect(youtubeErrorMessage(150, "karaoke.example.com")).not.toContain(
    "acessar por IP",
  );
  expect(youtubeErrorMessage(100, "karaoke.example.com")).toContain("removido");
  expect(youtubeErrorMessage(153, "karaoke.example.com")).toContain("Referer");
});
it("mostra o código original e uma ação adequada para falhas de player", () => {
  expect(youtubeErrorMessage(2, "localhost")).toContain(
    "identificador de vídeo inválido (YouTube 2)",
  );
  expect(youtubeErrorMessage(5, "localhost")).toContain("outro navegador");
  expect(youtubeErrorMessage(999, "localhost")).toContain("YouTube 999");
  expect(youtubeErrorMessage(undefined, "localhost")).toContain(
    "Verifique a conexão",
  );
});
