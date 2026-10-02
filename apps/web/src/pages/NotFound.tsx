import { Link } from "react-router";
import AppMark from "../components/AppMark";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <AppMark className="auth-logo" />

        <div className="auth-head">
          <h1>No encontramos esa página</h1>
          <span>El link puede estar mal escrito o la página ya no existe.</span>
        </div>

        <Link to={user ? "/" : "/login"} className="btn-primary">
          {user ? "Volver al inicio" : "Ir a iniciar sesión"}
        </Link>
      </div>
    </div>
  );
}
