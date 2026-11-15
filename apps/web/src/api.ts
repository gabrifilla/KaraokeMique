export function commandId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  if (body !== undefined && !document.cookie.includes("k_csrf="))
    await fetch("/api/v1/csrf");
  const csrf =
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("k_csrf="))
      ?.split("=")[1] || "";
  const r = await fetch(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "x-csrf-token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any;
  try {
    data = await r.json();
  } catch {
    throw new Error(
      "O servidor está indisponível. Verifique se a API está em execução.",
    );
  }
  if (!r.ok)
    throw new Error(
      data.error?.message || "Não foi possível concluir. Tente novamente.",
    );
  return data;
}
