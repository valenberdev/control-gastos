import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export default function LegalPage({
  title,
  updated,
  children,
}: LegalPageProps) {
  const { user } = useAuth();

  return (
    <div className="legal-page">
      <article className="legal">
        <Link to={user ? "/perfil" : "/login"} className="legal-back">
          ← Volver
        </Link>
        <h1>{title}</h1>
        <p className="legal-updated">Última actualización: {updated}</p>
        {children}
      </article>
    </div>
  );
}
