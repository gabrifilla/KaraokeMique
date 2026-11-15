import { isIP } from "node:net";
import { requireRule } from "../../../packages/domain/src/index.js";

function privateHost(host: string) {
  if (["localhost", "[::1]"].includes(host)) return true;
  const encoded =
    /^(?:[a-z0-9-]+\.)*((?:\d{1,3}\.){3}\d{1,3})\.sslip\.io$/.exec(host)?.[1];
  const ip = encoded || host;
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

const proxyPresets = ["loopback", "linklocal", "uniquelocal"];

function proxyAddress(entry: string) {
  const [ip, bits, extra] = entry.split("/");
  const family = isIP(ip);
  if (!family || extra !== undefined) return false;
  if (bits === undefined) return true;
  const max = family === 4 ? 32 : 128;
  return /^\d{1,3}$/.test(bits) && Number(bits) <= max;
}

// Express "trust proxy": only explicit proxies, so clients cannot forge X-Forwarded-For.
export function trustProxy(env: NodeJS.ProcessEnv): false | number | string {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw || raw === "false") return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  const entries = raw.split(",").map((entry) => entry.trim());
  requireRule(
    entries.every(
      (entry) => proxyPresets.includes(entry) || proxyAddress(entry),
    ),
    "CONFIG",
    "TRUST_PROXY aceita loopback, linklocal, uniquelocal, IPs/CIDR separados por vírgula ou número de saltos.",
  );
  return entries.join(",");
}

export function deploymentOrigin(env: NodeJS.ProcessEnv, mode: string) {
  const raw = env.WEB_ORIGIN || "http://localhost:5173";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      "WEB_ORIGIN deve ser uma URL completa, como http://karaoke.192.168.1.100.sslip.io:8080.",
    );
  }
  requireRule(
    ["http:", "https:"].includes(url.protocol) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password,
    "CONFIG",
    "WEB_ORIGIN deve conter apenas protocolo, endereço e porta.",
  );
  if (env.NODE_ENV === "production") {
    requireRule(
      env.WEB_ORIGIN && env.DATABASE_URL,
      "CONFIG",
      "Defina WEB_ORIGIN e DATABASE_URL no servidor.",
    );
    const lanHttp =
      env.ALLOW_HTTP_LAN === "true" &&
      url.protocol === "http:" &&
      privateHost(url.hostname);
    requireRule(
      mode === "real" && (url.protocol === "https:" || lanHttp),
      "CONFIG",
      "Produção exige integração real e HTTPS. HTTP local exige ALLOW_HTTP_LAN=true e endereço privado.",
    );
  }
  return url.origin;
}
