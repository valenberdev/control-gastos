import InstallGuide from "./InstallGuide";
import { useInstallState } from "../hooks/useInstallState";

export default function InstallSection() {
  const { info, canInstall, install } = useInstallState();

  return (
    <div className="card install-section">
      <h2>Instalar la app</h2>
      {info.standalone ? (
        <p className="mod-meta">
          La app ya está instalada en este dispositivo.
        </p>
      ) : (
        <InstallGuide
          info={info}
          canInstall={canInstall}
          onInstall={() => void install()}
        />
      )}
    </div>
  );
}
