import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import AuthTabs from "../components/AuthTabs";
import AppMark from "../components/AppMark";
import PasswordField from "../components/PasswordField";
import { ApiError } from "../api/client";

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
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Demasiados intentos. Esperá un rato y probá de nuevo.");
      } else if (err instanceof ApiError && err.status === 400 && err.serverMessage) {
        setError(err.serverMessage);
      } else {
        setError(
          "No se pudo crear la cuenta. Puede que ese email ya esté registrado.",
        );
      }
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
          <h1>Creá tu cuenta</h1>
          <span>
            Registrate con tu email para empezar a controlar tus gastos.
          </span>
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
          hint="Mínimo 8 caracteres."
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <span className="form-error">{error}</span>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
