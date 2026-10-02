import { Link } from "react-router";

const GITHUB_URL = "https://github.com/valenberdev/control-gastos";
const LINKEDIN_URL = "https://www.linkedin.com/in/valenberdini/";

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} Valentino Berdini</p>
      <nav
        aria-label="Información legal y contacto"
        className="site-footer-links"
      >
        <Link to="/privacidad">Privacidad</Link>
        <Link to="/terminos">Términos</Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub (se abre en una pestaña nueva)"
        >
          GitHub
        </a>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn (se abre en una pestaña nueva)"
        >
          LinkedIn
        </a>
      </nav>
    </footer>
  );
}
