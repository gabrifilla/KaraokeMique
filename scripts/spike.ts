import "dotenv/config";
import { writeFileSync } from "node:fs";
const checks: any[] = [];
for (const [name, url] of [
  [
    "YouTube search",
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&q=right+through+me+karaoke&key=${process.env.YOUTUBE_API_KEY || ""}`,
  ],
  ["YouTube IFrame script", "https://www.youtube.com/iframe_api"],
  [
    "GIPHY search",
    `https://api.giphy.com/v1/gifs/search?q=celebrate&rating=pg-13&limit=1&api_key=${process.env.VITE_GIPHY_API_KEY || ""}`,
  ],
] as const) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body = await r.text();
    checks.push({
      name,
      status: r.status,
      bytes: body.length,
      credentialPresent: name.startsWith("GIPHY")
        ? !!process.env.VITE_GIPHY_API_KEY
        : name.includes("search")
          ? !!process.env.YOUTUBE_API_KEY
          : undefined,
    });
  } catch {
    checks.push({ name, error: "NETWORK_UNAVAILABLE" });
  }
}
const report = {
  at: new Date().toISOString(),
  checks,
  limitations: [
    "HTTP não comprova reprodução/autoplay no navegador.",
    "Busca e compartilhamento real de GIF exigem chaves válidas; não há fallback silencioso.",
    "Cotas e contratação devem ser verificadas nas contas dos fornecedores.",
  ],
};
writeFileSync("docs/spike-result.json", JSON.stringify(report, null, 2));
console.log(report);
