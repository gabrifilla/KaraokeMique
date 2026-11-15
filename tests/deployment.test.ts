import { it, expect } from "vitest";
import { deploymentOrigin, trustProxy } from "../apps/api/src/deployment.js";
const env = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://example.invalid/db",
  WEB_ORIGIN: "https://karaoke.example.com",
};
it("produção mantém HTTPS e proíbe demonstração", () => {
  expect(deploymentOrigin(env, "real")).toBe(env.WEB_ORIGIN);
  expect(() => deploymentOrigin(env, "demo")).toThrow("integração real");
  expect(() => deploymentOrigin({ ...env, DATABASE_URL: "" }, "real")).toThrow(
    "DATABASE_URL",
  );
});
it.each([
  "http://192.168.1.50:8080",
  "http://10.0.0.2:8080",
  "http://172.16.2.1",
  "http://localhost:8080",
  "http://karaoke.192.168.1.50.sslip.io:8080",
])("HTTP privado exige opt-in explícito: %s", (WEB_ORIGIN) => {
  expect(() => deploymentOrigin({ ...env, WEB_ORIGIN }, "real")).toThrow(
    "HTTPS",
  );
  expect(
    deploymentOrigin({ ...env, WEB_ORIGIN, ALLOW_HTTP_LAN: "true" }, "real"),
  ).toBe(WEB_ORIGIN);
  expect(() =>
    deploymentOrigin({ ...env, WEB_ORIGIN, ALLOW_HTTP_LAN: "true" }, "demo"),
  ).toThrow();
});
it.each([
  "http://example.com",
  "http://8.8.8.8",
  "http://karaoke.8.8.8.8.sslip.io",
  "http://192.168.1.1.example.com",
  "http://172.32.0.1",
  "http://0.0.0.0",
])("flag local não libera HTTP público: %s", (WEB_ORIGIN) => {
  expect(() =>
    deploymentOrigin({ ...env, WEB_ORIGIN, ALLOW_HTTP_LAN: "true" }, "real"),
  ).toThrow("HTTPS");
});
it.each([
  "not a url",
  "https://host.example/path",
  "https://host.example?key=secret",
  "https://user:pass@host.example",
  "file:///tmp/test",
])("recusa origem inválida: %s", (WEB_ORIGIN) => {
  expect(() => deploymentOrigin({ ...env, WEB_ORIGIN }, "real")).toThrow();
});
it("proxy confiável só por opção explícita", () => {
  expect(trustProxy({})).toBe(false);
  expect(trustProxy({ TRUST_PROXY: "false" })).toBe(false);
  expect(trustProxy({ TRUST_PROXY: "1" })).toBe(1);
  expect(trustProxy({ TRUST_PROXY: "loopback" })).toBe("loopback");
  expect(trustProxy({ TRUST_PROXY: "loopback, 172.18.0.0/16" })).toBe(
    "loopback,172.18.0.0/16",
  );
});
it.each(["true", "*", "0.0.0.0/33", "example.com", "loopback,"])(
  "recusa proxy confiável inválido: %s",
  (TRUST_PROXY) => {
    expect(() => trustProxy({ TRUST_PROXY })).toThrow("TRUST_PROXY");
  },
);
