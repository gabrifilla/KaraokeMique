import { api } from "./api";

export type PushStatus =
  | "unsupported" // navegador sem push
  | "unconfigured" // servidor ainda sem as chaves VAPID
  | "install" // iPhone/iPad: precisa adicionar à Tela de Início primeiro
  | "denied" // a pessoa bloqueou as notificações
  | "off" // dá para ligar
  | "on";

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

/** Disparado quando os avisos são ligados em algum lugar do app. */
export const PUSH_EVENT = "karaoke:push-changed";

let registration: Promise<ServiceWorkerRegistration | undefined> | undefined;
export function registerServiceWorker() {
  registration ??=
    "serviceWorker" in navigator
      ? navigator.serviceWorker.register("/sw.js").catch(() => undefined)
      : Promise.resolve(undefined);
  return registration;
}

let key: Promise<string | null> | undefined;
const publicKey = () =>
  (key ??= api<{ publicKey: string | null }>("/push/key")
    .then((r) => r.publicKey)
    .catch(() => null));

export async function pushStatus(): Promise<PushStatus> {
  if (!(await publicKey())) return "unconfigured";
  // No iPhone/iPad, push de site só existe no app instalado na Tela de Início.
  if (isIos() && !standalone()) return "install";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const reg = await registerServiceWorker();
  return (await reg?.pushManager.getSubscription()) ? "on" : "off";
}

function toKey(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Pede permissão (precisa de um toque da pessoa) e liga os avisos da sala. */
export async function enablePush(roomId: string): Promise<PushStatus> {
  const k = await publicKey();
  if (!k) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return permission === "denied" ? "denied" : "off";
  const reg = await registerServiceWorker();
  if (!reg) return "unsupported";
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toKey(k),
    }));
  await api(`/rooms/${roomId}/push`, sub.toJSON());
  return "on";
}

/** Já autorizado antes: vincula o aparelho a esta sala sem perguntar de novo. */
export async function resumePush(roomId: string) {
  if ((await pushStatus()) !== "on") return;
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await api(`/rooms/${roomId}/push`, sub.toJSON()).catch(() => {});
}
