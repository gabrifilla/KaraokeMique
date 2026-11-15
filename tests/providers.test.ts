import { it, expect, vi, afterEach } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

it("sugestões compartilham consulta e cache por 24h, com validação dos vídeos", async () => {
  vi.stubEnv("INTEGRATION_MODE", "real");
  vi.stubEnv("YOUTUBE_API_KEY", "test-key-only");
  const time = vi.spyOn(Date, "now").mockReturnValue(1000000);
  const urls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const u = new URL(input);
      urls.push(u);
      return new Response(
        JSON.stringify(
          u.pathname.endsWith("/search")
            ? {
                items: ["abcdefghijk", "long0000000"].map((videoId) => ({
                  id: { videoId },
                })),
                nextPageToken: "unused",
              }
            : {
                items: ["abcdefghijk", "long0000000"].map((id, i) => ({
                  id,
                  snippet: {
                    title: "Karaokê",
                    channelTitle: "Canal",
                    liveBroadcastContent: "none",
                    thumbnails: {
                      default: { url: "https://i.ytimg.com/test.jpg" },
                    },
                  },
                  status: { embeddable: true },
                  contentDetails: { duration: i ? "PT20M" : "PT3M" },
                })),
              },
        ),
      );
    }),
  );
  const p = await import("../apps/api/src/youtube.js");
  const [first, second] = await Promise.all([
    p.suggestions("pop-internacional"),
    p.suggestions("pop-internacional"),
  ]);
  expect(first).toEqual(second);
  expect(first.items.map((v) => v.id)).toEqual(["abcdefghijk"]);
  expect(first).not.toHaveProperty("cursor");
  expect(urls[0].searchParams.get("q")).toBe("2000s pop hits karaoke");
  expect(urls[0].searchParams.get("regionCode")).toBe("BR");
  await p.suggestions("pop-internacional");
  expect(urls).toHaveLength(2);
  time.mockReturnValue(1000000 + 24 * 60 * 60 * 1000 + 1);
  await p.suggestions("pop-internacional");
  expect(urls).toHaveLength(4);
});

it("falha das sugestões não inventa catálogo nem repete chamadas durante o cooldown", async () => {
  vi.stubEnv("INTEGRATION_MODE", "real");
  vi.stubEnv("YOUTUBE_API_KEY", "test-key-only");
  const time = vi.spyOn(Date, "now").mockReturnValue(1000000);
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }),
        { status: 403 },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  const p = await import("../apps/api/src/youtube.js");
  await expect(p.suggestions()).rejects.toMatchObject({
    code: "PROVIDER_QUOTA_EXCEEDED",
  });
  await expect(p.suggestions()).rejects.toMatchObject({
    code: "PROVIDER_QUOTA_EXCEEDED",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  time.mockReturnValue(1060001);
  await expect(p.suggestions()).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("sugestões demo permanecem identificadas e sem acesso ao fornecedor", async () => {
  vi.stubEnv("INTEGRATION_MODE", "demo");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const p = await import("../apps/api/src/youtube.js");
  expect(await p.suggestions()).toMatchObject({
    mode: "demo",
    items: p.demoVideos,
  });
  expect(fetch).not.toHaveBeenCalled();
});
it("rotação percorre todos os temas antes de repetir, sem aceitar buscas arbitrárias", async () => {
  vi.stubEnv("INTEGRATION_MODE", "demo");
  const p = await import("../apps/api/src/youtube.js");
  expect(p.suggestionThemes.length).toBeGreaterThanOrEqual(10);
  const ids: string[] = [];
  for (let i = 0; i < p.suggestionThemes.length; i++)
    ids.push((await p.suggestions()).theme.id);
  expect(new Set(ids).size).toBe(p.suggestionThemes.length);
  expect((await p.suggestions()).theme.id).toBe(ids[0]);
  await expect(p.suggestions("consulta não cadastrada")).rejects.toMatchObject({
    code: "INVALID_THEME",
  });
});
it("adaptador real envia parâmetros corretos e valida metadados em lote", async () => {
  vi.stubEnv("INTEGRATION_MODE", "real");
  vi.stubEnv("YOUTUBE_API_KEY", "test-key-only");
  const urls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const u = new URL(input);
      urls.push(u);
      return new Response(
        JSON.stringify(
          u.pathname.endsWith("/search")
            ? {
                items: [{ id: { videoId: "abcdefghijk" } }],
                nextPageToken: "next",
              }
            : {
                items: [
                  {
                    id: "abcdefghijk",
                    snippet: {
                      title: "Música",
                      channelTitle: "Canal",
                      liveBroadcastContent: "none",
                      thumbnails: {
                        medium: {
                          url: "https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg",
                        },
                      },
                    },
                    status: { embeddable: true },
                    contentDetails: { duration: "PT3M12S" },
                  },
                ],
              },
        ),
        { status: 200 },
      );
    }),
  );
  const provider = await import("../apps/api/src/youtube.js");
  const r = await provider.search("right through me");
  expect(urls[0].searchParams.get("q")).toBe("right through me karaoke");
  expect(urls[0].searchParams.get("videoEmbeddable")).toBe("true");
  expect(urls[1].searchParams.get("id")).toBe("abcdefghijk");
  expect(r.items[0].duration).toBe(192);
  await provider.search("right through me");
  expect(urls).toHaveLength(2);
});
it("sem chave não simula resultados, erro de quota preserva diagnóstico", async () => {
  vi.stubEnv("INTEGRATION_MODE", "real");
  vi.stubEnv("YOUTUBE_API_KEY", "");
  const p = await import("../apps/api/src/youtube.js");
  await expect(p.search("Música")).rejects.toThrow("Configure");
  vi.stubEnv("YOUTUBE_API_KEY", "test-key-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }),
          { status: 403 },
        ),
    ),
  );
  await expect(p.search("Outra música")).rejects.toMatchObject({
    code: "PROVIDER_QUOTA_EXCEEDED",
  });
});
it("recusa live, vídeo longo, sem duração e sem incorporação", async () => {
  vi.stubEnv("INTEGRATION_MODE", "real");
  vi.stubEnv("YOUTUBE_API_KEY", "test-key-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [
              ["live", "PT1M", true],
              ["none", "PT16M", true],
              ["none", "PT0S", true],
              ["none", "PT1M", false],
            ].map(([live, duration, embed]) => ({
              id: "abcdefghijk",
              snippet: { liveBroadcastContent: live },
              status: { embeddable: embed },
              contentDetails: { duration },
            })),
          }),
        ),
    ),
  );
  const p = await import("../apps/api/src/youtube.js");
  await expect(p.validateVideo("abcdefghijk")).rejects.toThrow("indisponível");
});
