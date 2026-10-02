import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { post, ApiError } from "../api/client";
import AppMark from "../components/AppMark";
import PasswordField from "../components/PasswordField";

function readTokenFromHash(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("token");
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token] = useState(readTokenFromHash);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña tiene que tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Demasiados intentos. Esperá unos minutos y probá de nuevo.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError(
          err.serverMessage ?? "El link no es válido o ya venció. Pedí uno nuevo.",
        );
      } else {
        setError("No se pudo cambiar la contraseña. Probá de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <AppMark className="auth-logo" />

        {done ? (
          <>
            <div className="auth-head">
              <h1>Contraseña actualizada</h1>
              <span>Ya podés iniciar sesión con tu contraseña nueva.</span>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/login")}
            >
              Ir a iniciar sesión
            </button>
          </>
        ) : !token ? (
          <>
            <div className="auth-head">
              <h1>Link no válido</h1>
              <span>Este link está incompleto. Pedí uno nuevo.</span>
            </div>
            <Link to="/olvide-mi-contrasena" className="auth-link">
              Pedir un link nuevo
            </Link>
          </>
        ) : (
          <>
            <div className="auth-head">
              <h1>Elegí una contraseña nueva</h1>
              <span>Después vas a poder iniciar sesión con ella.</span>
            </div>

            <PasswordField
              label="Contraseña nueva"
              hint="Mínimo 8 caracteres."
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <span className="form-error">{error}</span>}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Guardando..." : "Guardar contraseña"}
            </button>

            <Link to="/olvide-mi-contrasena" className="auth-link">
              ¿El link venció? Pedí uno nuevo
            </Link>
          </>
        )}
      </form>
    </div>
  );
}
