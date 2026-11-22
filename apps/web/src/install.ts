/**
 * Instalar o Karaoke como app (PWA).
 * - Android e computador (Chrome/Edge): o navegador dispara
 *   "beforeinstallprompt"; guardamos o convite e mostramos nosso botão.
 * - iPhone/iPad: não existe convite automático; a pessoa usa
 *   Compartilhar → Adicionar à Tela de Início. Mostramos o passo a passo.
 */
export const isAppleDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let deferred: InstallPrompt | undefined;
export const INSTALL_EVENT = "karaoke:install-changed";
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Troca a barrinha discreta do navegador pelo nosso botão.
    e.preventDefault();
    deferred = e as InstallPrompt;
    window.dispatchEvent(new Event(INSTALL_EVENT));
  });
  window.addEventListener("appinstalled", () => {
    deferred = undefined;
    window.dispatchEvent(new Event(INSTALL_EVENT));
  });
}
export const canPromptInstall = () => !!deferred;
export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = undefined;
  await event.prompt();
  const choice = await event.userChoice;
  window.dispatchEvent(new Event(INSTALL_EVENT));
  return choice.outcome === "accepted";
}
