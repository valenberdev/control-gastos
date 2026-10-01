import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { del, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PasswordField from "./PasswordField";

export default function DeleteAccountSection() {
  const { logout } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function open() {
    setPassword("");
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDeleting(true);
    try {
      await del("/auth/me", { password });
      logout();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("La contraseña no es correcta.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Demasiados intentos. Esperá unos minutos y probá de nuevo.");
      } else {
        setError("No se pudo eliminar la cuenta. Probá de nuevo.");
      }
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="card danger-zone">
        <h2>Eliminar cuenta</h2>
        <p className="mod-meta">
          Se borran tu cuenta, todos tus movimientos, el vínculo con Telegram y
          las suscripciones a notificaciones. No se puede deshacer.
        </p>
        <button type="button" className="btn-danger" onClick={open}>
          Eliminar mi cuenta
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="movement-dialog"
        aria-labelledby="delete-account-title"
      >
        <form onSubmit={handleSubmit} noValidate className="dialog-form">
          <h2 id="delete-account-title">¿Eliminar tu cuenta?</h2>
          <p className="mod-meta">
            Para confirmar, escribí tu contraseña. Después de esto no vas a
            poder recuperar tus datos.
          </p>

          <PasswordField
            label="Tu contraseña"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <span className="form-error" role="alert">
              {error}
            </span>
          )}

          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={close}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={deleting || password.length === 0}
            >
              {deleting ? "Eliminando..." : "Eliminar definitivamente"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
