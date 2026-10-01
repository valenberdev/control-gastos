import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import AuthTabs from "../components/AuthTabs";
import AppMark from "../components/AppMark";
import PasswordField from "../components/PasswordField";
import { ApiError } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Demasiados intentos. Esperá unos minutos y probá de nuevo."
          : "Email o contraseña incorrectos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <AppMark className="auth-logo" />
        <AuthTabs />

        <div className="auth-head">
          <h1>Bienvenido de nuevo</h1>
          <span>Ingresá con tu email y contraseña.</span>
        </div>

        <label className="field">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </label>

        <PasswordField
          label="Contraseña"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="auth-link-row">
          <Link to="/olvide-mi-contrasena" className="auth-link">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && <span className="form-error">{error}</span>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
