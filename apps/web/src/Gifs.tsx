import { useState } from "react";
const key = import.meta.env.VITE_GIPHY_API_KEY;
export async function giphy(path: string, params: Record<string, string> = {}) {
  if (!key)
    throw new Error(
      "Busca de GIFs indisponível: configure VITE_GIPHY_API_KEY.",
    );
  const u = new URL(`https://api.giphy.com/v1/gifs/${path}`);
  u.search = new URLSearchParams({ api_key: key, ...params }).toString();
  // AbortSignal.timeout só existe a partir do Chromium 103; navegadores de TV
  // mais antigos lançariam erro e o GIF seria descartado em silêncio.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const r = await fetch(u, { signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
  if (!r.ok)
    throw new Error(
      "GIPHY indisponível ou cota esgotada. Os emojis continuam disponíveis.",
    );
  return r.json();
}
export function GifPicker({
  send,
}: {
  send: (type: string, value: string) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  async function search(more = false) {
    setError("");
    setBusy(true);
    try {
      const next = more ? offset + 12 : 0;
      const r = await giphy(q.trim() ? "search" : "trending", {
        q: q.trim(),
        rating: "pg-13",
        limit: "12",
        offset: String(next),
        lang: "pt",
      });
      setItems(more ? [...items, ...r.data] : r.data);
      setOffset(next);
      setHasMore(next + r.data.length < r.pagination.total_count);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="gif-picker">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="gifs">Encontre sua reação</label>
        <div className="input-row">
          <input
            id="gifs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
            placeholder="Aplausos, festa, emoção…"
          />
          <button disabled={busy}>Buscar GIFs</button>
        </div>
      </form>
      <a
        href="https://giphy.com"
        target="_blank"
        rel="noreferrer"
        className="attribution"
      >
        Powered By GIPHY
      </a>
      {error && <p role="alert">{error}</p>}
      <div className="gif-grid">
        {items.map((g) => (
          <button
            key={g.id}
            onClick={() => send("GIF", g.id)}
            aria-label={`Enviar GIF: ${g.title || "reação"}`}
          >
            <img
              src={g.images.fixed_height_small.url}
              alt={g.title || "Reação animada"}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {hasMore && (
        <button disabled={busy} onClick={() => void search(true)}>
          Mais GIFs
        </button>
      )}
    </section>
  );
}
