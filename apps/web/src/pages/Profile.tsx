import { useState, useEffect } from "react";
import { post } from "../api/client";
import { useAuth } from "../context/AuthContext";

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
      <h1 style={{ fontSize: 20 }}>Perfil</h1>

      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cuenta</span>
        <span style={{ fontSize: 15 }}>{user?.email}</span>
      </div>

      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <span style={{ fontSize: 15, fontWeight: 700 }}>Vincular Telegram</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Generá un código y mandaselo al bot con <code>/vincular</code>.
        </span>

        {linkCode && !expired && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "12px 0",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4 }}>
              {linkCode.code}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Expira en {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}

        {expired && (
          <span style={{ fontSize: 13, color: "var(--expense)" }}>
            El código expiró.
          </span>
        )}
        {error && (
          <span style={{ fontSize: 13, color: "var(--expense)" }}>{error}</span>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={buttonStyle}
        >
          {generating
            ? "Generando..."
            : linkCode
              ? "Generar otro código"
              : "Generar código"}
        </button>
      </div>

      <button
        onClick={logout}
        style={{
          ...buttonStyle,
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "12px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  background: "var(--accent)",
  color: "#fff",
};
