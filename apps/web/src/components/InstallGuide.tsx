import type { PlatformInfo } from "../lib/installPlatform";

interface InstallGuideProps {
  info: PlatformInfo;
  canInstall: boolean;
  onInstall: () => void;
}

function IosSteps() {
  return (
    <ol className="install-steps">
      <li>
        Abrí esta página en <strong>Safari</strong>.
      </li>
      <li>
        Tocá el botón <strong>Compartir</strong> (el cuadrado con una flecha
        hacia arriba). En iOS 26, tocá primero los tres puntos{" "}
        <strong>⋯</strong> del menú de abajo y después{" "}
        <strong>Compartir</strong>.
      </li>
      <li>
        Elegí <strong>Agregar a pantalla de inicio</strong>. Si aparece la
        opción «Abrir como app web», dejala activada.
      </li>
      <li>
        Tocá <strong>Agregar</strong> y abrí la app desde el ícono nuevo.
      </li>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="install-steps">
      <li>
        Tocá el menú <strong>⋮</strong> del navegador (arriba a la derecha).
      </li>
      <li>
        Elegí <strong>Instalar app</strong> o{" "}
        <strong>Agregar a la pantalla principal</strong>.
      </li>
      <li>
        Confirmá con <strong>Instalar</strong> y abrí la app desde el ícono
        nuevo.
      </li>
    </ol>
  );
}

export default function InstallGuide({
  info,
  canInstall,
  onInstall,
}: InstallGuideProps) {
  return (
    <div className="install-guide">
      {info.openIn && (
        <p className="install-notice">
          Para instalarla, abrí esta página en <strong>{info.openIn}</strong>:
          ahora estás en otro navegador (por ejemplo, el de una app) y desde ahí
          no se puede.
        </p>
      )}

      {canInstall && (
        <button type="button" className="btn-primary" onClick={onInstall}>
          Instalar la app
        </button>
      )}

      {!canInstall && info.platform === "ios" && <IosSteps />}
      {!canInstall && info.platform === "android" && <AndroidSteps />}
      {!canInstall && info.platform === "other" && (
        <p className="mod-meta">
          En Chrome o Edge, buscá el ícono de instalar en la barra de
          direcciones o abrí el menú y elegí instalar la app (el nombre exacto
          cambia según el navegador).
        </p>
      )}

      <p className="mod-meta">
        Con la app instalada, además, funcionan las notificaciones.
        {info.platform === "ios" &&
          " La primera vez te va a pedir iniciar sesión otra vez: es normal."}
      </p>
    </div>
  );
}
