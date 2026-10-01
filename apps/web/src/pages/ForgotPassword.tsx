import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { post, ApiError } from "../api/client";
import AppMark from "../components/AppMark";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Demasiados intentos. Esperá un rato y probá de nuevo."
          : "No se pudo enviar el pedido. Probá de nuevo en un momento.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <AppMark className="auth-logo" />

        <div className="auth-head">
          <h1>Recuperá tu contraseña</h1>
          <span>
            Ingresá tu email y, si existe una cuenta, te mandamos un link para
            elegir una nueva.
          </span>
        </div>

        {sent ? (
          <>
            <span className="form-success" role="status">
              Si existe una cuenta con ese email, te mandamos un link. Puede
              tardar unos minutos: revisá también la carpeta de spam.
            </span>
            <Link to="/login" className="auth-link">
              Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <>
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

            {error && <span className="form-error">{error}</span>}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Enviando..." : "Enviarme el link"}
            </button>

            <Link to="/login" className="auth-link">
              Volver a iniciar sesión
            </Link>
          </>
        )}
      </form>
    </div>
  );
}
