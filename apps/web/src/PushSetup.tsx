import { useEffect, useState } from "react";
import { enablePush, pushStatus, PUSH_EVENT, type PushStatus } from "./push";
import {
  canPromptInstall,
  INSTALL_EVENT,
  isAppleDevice,
  isStandalone,
  promptInstall,
} from "./install";

/** Botão "Instalar o app" (Android/computador), quando o navegador oferece. */
export function InstallButton({ className = "" }: { className?: string }) {
  const [available, setAvailable] = useState(canPromptInstall);
  useEffect(() => {
    const update = () => setAvailable(canPromptInstall());
    window.addEventListener(INSTALL_EVENT, update);
    return () => window.removeEventListener(INSTALL_EVENT, update);
  }, []);
  if (!available || isStandalone()) return null;
  return (
    <button
      type="button"
      className={`install-app ${className}`}
      onClick={() => void promptInstall()}
    >
      📲 Instalar o app
    </button>
  );
}

/** Passo a passo do iPhone/iPad para adicionar à Tela de Início. */
export function IosInstallSteps() {
  return (
    <ol className="ios-install">
      <li>
        No Safari, toque em <strong>Compartilhar</strong>{" "}
        <span aria-hidden="true">(o quadrado com a seta ⬆️)</span>.
      </li>
      <li>
        Escolha <strong>Adicionar à Tela de Início</strong> e confirme em{" "}
        <strong>Adicionar</strong>.
      </li>
      <li>
        Abra o <strong>Karaoke</strong> pelo ícone novo: você volta direto pra
        festa. Lá, toque em <strong>🔔 Me avise</strong>.
      </li>
    </ol>
  );
}

/**
 * Pede a permissão de notificações de verdade: o toque no botão abre a janela
 * oficial do navegador ("Permitir"), e aceitar inscreve este aparelho na sala.
 */
export function PushSetup({
  roomId,
  onEnabled,
}: {
  roomId: string;
  onEnabled?: () => void;
}) {
  const [status, setStatus] = useState<PushStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void pushStatus().then(setStatus);
  }, []);
  if (status === "loading") return null;
  if (status === "on")
    return (
      <p className="push-setup-note">
        ✅ Avisos ligados neste celular. Eu te chamo quando chegar sua vez!
      </p>
    );
  if (status === "install")
    return (
      <>
        <p className="push-setup-note">
          No iPhone, os avisos com a tela bloqueada só funcionam com o Karaoke
          instalado:
        </p>
        <IosInstallSteps />
      </>
    );
  if (status === "denied")
    return (
      <p className="push-setup-note">
        As notificações estão bloqueadas para este site. Para liberar, abra os
        ajustes do navegador, procure <strong>Notificações</strong> e permita o
        Karaoke Míque.
      </p>
    );
  if (status === "unconfigured")
    return (
      <p className="push-setup-note">
        Com o app aberto, eu vibro e toco um “ding” quando chegar sua vez. Os
        avisos com a tela bloqueada ainda não foram ligados neste servidor.
      </p>
    );
  if (status === "unsupported")
    return (
      <>
        <p className="push-setup-note">
          Este navegador não recebe avisos com a tela bloqueada. Com o app
          aberto, eu vibro e toco um “ding” quando chegar sua vez.
        </p>
        {isAppleDevice() && !isStandalone() && <IosInstallSteps />}
        <InstallButton />
      </>
    );
  return (
    <>
      <button
        type="button"
        className="push-setup-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            const next = await enablePush(roomId);
            setStatus(next);
            window.dispatchEvent(new Event(PUSH_EVENT));
            if (next === "on") onEnabled?.();
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        🔔 Sim, quero ser avisado!
      </button>
      <p className="push-setup-note">
        Depois toque em <strong>Permitir</strong> na janela do navegador.
      </p>
      {failed && (
        <p className="push-setup-note" role="alert">
          Não deu para ligar os avisos agora. Tente de novo pelo cartão da sala.
        </p>
      )}
      <InstallButton />
    </>
  );
}
