import { useEffect } from "react";
import { useLocation } from "react-router";

const APP_NAME = "Control de Gastos";

const TITLES: Record<string, string> = {
  "/": "Inicio",
  "/login": "Iniciar sesión",
  "/registro": "Crear cuenta",
  "/olvide-mi-contrasena": "Recuperar contraseña",
  "/restablecer": "Elegir una contraseña nueva",
  "/historial": "Historial",
  "/perfil": "Perfil",
  "/privacidad": "Política de privacidad",
  "/terminos": "Términos y condiciones",
};

export default function RouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    const title = TITLES[path] ?? "Página no encontrada";
    document.title = `${title} · ${APP_NAME}`;
  }, [pathname]);

  return null;
}
