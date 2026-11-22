import {
  requireRule,
  RuleError,
  searchQuery,
} from "../../../packages/domain/src/index.js";
import type { Video } from "../../../packages/contracts/src/index.js";
export const mode = process.env.INTEGRATION_MODE || "real";
export const demoVideos: Video[] = [
  "Noite de estrelas",
  "Cante com a galera",
  "Bis de domingo",
].map((title, i) => ({
  id: `demo000000${i}`,
  title: `${title} · demonstração`,
  channel: "Catálogo simulado, sem vídeo YouTube",
  thumbnail: "",
  duration: 20,
  fetchedAt: Date.now(),
}));
const cache = new Map<string, { until: number; value: any }>();
const inflight = new Map<string, Promise<any>>();
async function api(endpoint: string, params: Record<string, string>) {
  requireRule(
    process.env.YOUTUBE_API_KEY,
    "PROVIDER_NOT_CONFIGURED",
    "Configure YOUTUBE_API_KEY para pesquisar no YouTube.",
    503,
  );
  const u = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  u.search = new URLSearchParams({
    ...params,
    key: process.env.YOUTUBE_API_KEY,
  }).toString();
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as any;
      const quota = body.error?.errors?.some((e: any) =>
        ["quotaExceeded", "dailyLimitExceeded"].includes(e.reason),
      );
      throw new RuleError(
        quota ? "PROVIDER_QUOTA_EXCEEDED" : "PROVIDER_UNAVAILABLE",
        "O YouTube não respondeu agora. A fila continua do jeito que estava.",
        503,
      );
    }
    return (await r.json()) as any;
  } catch (e) {
    if (e instanceof RuleError) throw e;
    throw new RuleError(
      "PROVIDER_UNAVAILABLE",
      "O YouTube não respondeu agora. Tente de novo em instantes.",
      503,
    );
  }
}
const seconds = (s: string) => {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(s);
  return m ? +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0) : 0;
};
export async function metadata(ids: string[]): Promise<Video[]> {
  const r = await api("videos", {
    part: "snippet,contentDetails,status",
    id: ids.join(","),
  });
  return r.items
    .filter(
      (v: any) =>
        v.status.embeddable &&
        v.snippet.liveBroadcastContent === "none" &&
        !v.contentDetails.regionRestriction?.blocked?.includes("BR") &&
        (!v.contentDetails.regionRestriction?.allowed ||
          v.contentDetails.regionRestriction.allowed.includes("BR")) &&
        seconds(v.contentDetails.duration) > 0 &&
        seconds(v.contentDetails.duration) <= 900,
    )
    .map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail:
        v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default.url,
      duration: seconds(v.contentDetails.duration),
      fetchedAt: Date.now(),
    }));
}
export async function search(q: string, cursor = "") {
  requireRule(
    q.trim().length >= 2 && q.length <= 120 && cursor.length <= 250,
    "INVALID_QUERY",
    "Digite entre 2 e 120 caracteres.",
    400,
  );
  if (mode === "demo")
    return { items: demoVideos, mode, query: searchQuery(q) };
  const key = JSON.stringify([searchQuery(q), cursor]);
  const entry = cache.get(key);
  if (entry && entry.until > Date.now()) return entry.value;
  if (inflight.has(key)) return inflight.get(key);
  const promise = (async () => {
    const r = await api("search", {
      part: "snippet",
      type: "video",
      q: searchQuery(q),
      videoEmbeddable: "true",
      videoSyndicated: "true",
      maxResults: "12",
      regionCode: "BR",
      relevanceLanguage: "pt",
      ...(cursor ? { pageToken: cursor } : {}),
    });
    const items = r.items.length
      ? await metadata(r.items.map((v: any) => v.id.videoId))
      : [];
    const value = { items, cursor: r.nextPageToken, mode };
    if (cache.size > 500) cache.clear();
    cache.set(key, { until: Date.now() + 600000, value });
    return value;
  })();
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
export async function validateVideo(id: string) {
  requireRule(
    /^[a-zA-Z0-9_-]{11}$/.test(id),
    "INVALID_VIDEO",
    "Não conseguimos usar esse vídeo. Escolha outro.",
    400,
  );
  const video =
    mode === "demo"
      ? demoVideos.find((v) => v.id === id)
      : (await metadata([id]))[0];
  requireRule(
    video,
    "VIDEO_UNAVAILABLE",
    "Esse vídeo não dá pra usar: ele está indisponível, é ao vivo, é longo demais ou o dono não deixa tocar fora do YouTube.",
  );
  return video;
}

// Rotação de temas, com consultas compartilhadas e limitadas ao catálogo abaixo.
export const suggestionThemes = [
  {
    id: "pop-internacional",
    label: "Pop internacional · anos 2000",
    query: "2000s pop hits",
  },
  { id: "rock-nacional", label: "Rock nacional", query: "rock nacional" },
  {
    id: "pop-brasileiro",
    label: "Pop brasileiro · anos 2000",
    query: "pop brasileiro anos 2000",
  },
  { id: "emo", label: "Emo · anos 2000", query: "emo rock anos 2000" },
  { id: "pop-punk", label: "Pop punk", query: "pop punk" },
  { id: "rock-classico", label: "Rock clássico", query: "classic rock" },
  { id: "pop-90", label: "Pop · anos 90", query: "90s pop hits" },
  { id: "grunge", label: "Grunge", query: "grunge rock" },
  { id: "indie", label: "Indie rock", query: "indie rock" },
  { id: "new-wave", label: "New wave · anos 80", query: "new wave anos 80" },
  { id: "metal", label: "Heavy metal", query: "heavy metal" },
  { id: "rnb", label: "R&B e soul", query: "r&b soul" },
  {
    id: "disco",
    label: "Disco e dance · anos 80",
    query: "disco dance anos 80",
  },
  { id: "mpb", label: "MPB", query: "mpb clássicos" },
  {
    id: "trilhas",
    label: "Disney e trilhas sonoras",
    query: "Disney trilhas sonoras",
  },
  {
    id: "alternativo",
    label: "Rock alternativo · anos 90",
    query: "alternative rock anos 90",
  },
] as const;
type Suggestions = {
  items: Video[];
  mode: string;
  theme: { id: string; label: string };
};
const suggestionCache = new Map<
  string,
  { until: number; value: Suggestions }
>();
const suggestionRequests = new Map<string, Promise<Suggestions>>();
let nextSuggestionTheme = 0;
let suggestionFailure: { until: number; error: unknown } | undefined;
export async function suggestions(themeId?: string): Promise<Suggestions> {
  const theme =
    themeId === undefined
      ? suggestionThemes[nextSuggestionTheme++ % suggestionThemes.length]
      : suggestionThemes.find((t) => t.id === themeId);
  requireRule(theme, "INVALID_THEME", "Tema de sugestões inválido.", 400);
  const cached = suggestionCache.get(theme.id);
  if (cached && cached.until > Date.now()) return cached.value;
  if (suggestionFailure && suggestionFailure.until > Date.now())
    throw suggestionFailure.error;
  if (suggestionRequests.has(theme.id))
    return suggestionRequests.get(theme.id)!;
  const request = (async () => {
    const result = await search(theme.query);
    const value = {
      items: result.items,
      mode,
      theme: { id: theme.id, label: theme.label },
    };
    suggestionCache.set(theme.id, {
      until: Date.now() + (value.items.length ? 24 * 60 * 60 * 1000 : 600000),
      value,
    });
    suggestionFailure = undefined;
    return value;
  })();
  suggestionRequests.set(theme.id, request);
  try {
    return await request;
  } catch (error) {
    // Uma indisponibilidade não dispara uma sequência de chamadas por sala/celular.
    suggestionFailure = { until: Date.now() + 60000, error };
    throw error;
  } finally {
    suggestionRequests.delete(theme.id);
  }
}
