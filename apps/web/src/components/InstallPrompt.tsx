import { useEffect, useRef, useState } from "react";
import InstallGuide from "./InstallGuide";
import { useInstallState } from "../hooks/useInstallState";
import {
  dismissInstallHintForever,
  shouldShowInstallHint,
  snoozeInstallHint,
} from "../lib/installHint";

export default function InstallPrompt() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { info, canInstall, install } = useInstallState();
  const [eligible] = useState(
    () =>
      info.platform !== "other" && !info.standalone && shouldShowInstallHint(),
  );

  useEffect(() => {
    if (!eligible) return;
    const timer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [eligible]);

  if (!eligible) return null;

  function close() {
    dialogRef.current?.close();
  }

  function neverShowAgain() {
    dismissInstallHintForever();
    close();
  }

  async function handleInstall() {
    const outcome = await install();
    if (outcome === "accepted") {
      dismissInstallHintForever();
      close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="movement-dialog"
      aria-labelledby="install-title"
      onClose={() => snoozeInstallHint()}
    >
      <div className="dialog-form">
        <h2 id="install-title">Tené la app a un toque</h2>
        <p className="mod-meta">
          Instalala en la pantalla de inicio del teléfono: se abre como una app,
          sin la barra del navegador.
        </p>

        <InstallGuide
          info={info}
          canInstall={canInstall}
          onInstall={() => void handleInstall()}
        />

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={close}>
            Más tarde
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={neverShowAgain}
          >
            No volver a mostrar
          </button>
        </div>
      </div>
    </dialog>
  );
}
