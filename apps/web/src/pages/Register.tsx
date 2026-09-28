import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import AuthTabs from "../components/AuthTabs";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña tiene que tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/");
    } catch {
      setError(
        "No se pudo crear la cuenta. Puede que ese email ya esté registrado.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <AuthTabs />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 style={{ fontSize: 22 }}>Creá tu cuenta</h1>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Registrate con tu email para empezar a controlar tus gastos.
          </span>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Contraseña
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: 12 }}>Mínimo 8 caracteres.</span>
        </label>

        {error && (
          <span style={{ color: "var(--expense)", fontSize: 13 }}>{error}</span>
        )}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
};

const buttonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
