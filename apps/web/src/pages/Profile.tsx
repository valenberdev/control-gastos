import { useState, useEffect } from "react";
import { post } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import TimezoneSetting from "../components/TimezoneSetting";
import DeleteAccountSection from "../components/DeleteAccountSection";
import TelegramLinks from "../components/TelegramLinks";
import { Link } from "react-router";
import InstallSection from "../components/InstallSection";

interface LinkCodeResponse {
  code: string;
  expiresAt: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [linkCode, setLinkCode] = useState<LinkCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkCode) return;

    const interval = setInterval(() => {
      const remaining = Math.round(
        (new Date(linkCode.expiresAt).getTime() - Date.now()) / 1000,
      );
      setSecondsLeft(Math.max(remaining, 0));
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [linkCode]);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const data = await post<LinkCodeResponse>("/auth/link-code", {});
      setLinkCode(data);
    } catch {
      setError("No se pudo generar el código. Probá de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  const expired = linkCode !== null && secondsLeft <= 0;

  return (
    <div className="page-container">
      <h1 className="page-title">Perfil</h1>

      <div className="card stack-sm">
        <span className="mod-title">Cuenta</span>
        <span className="account-email">{user?.email}</span>
      </div>

      <div className="card row-between">
        <span className="mod-title">Tema claro</span>
        <ThemeToggle />
      </div>

      <TimezoneSetting />

      <div className="card stack">
        <span className="mod-title">Vincular Telegram</span>
        <span className="mod-meta">
          Generá un código y mandaselo al bot con <code>/vincular</code>.
        </span>

        <TelegramLinks />

        {linkCode && !expired && (
          <div className="link-code">
            <span className="fig">{linkCode.code}</span>
            <span className="mod-meta">
              Expira en {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}

        {expired && <span className="form-error">El código expiró.</span>}
        {error && <span className="form-error">{error}</span>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
        >
          {generating
            ? "Generando..."
            : linkCode
              ? "Generar otro código"
              : "Generar código"}
        </button>
      </div>

      <button onClick={logout} className="btn-secondary">
        Cerrar sesión
      </button>

      <InstallSection />

      <DeleteAccountSection />

      <nav className="profile-legal" aria-label="Información legal">
        <Link to="/privacidad">Política de privacidad</Link>
        <Link to="/terminos">Términos y condiciones</Link>
      </nav>
    </div>
  );
}
