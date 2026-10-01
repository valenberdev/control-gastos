import { NavLink } from "react-router";

const tabs = [
  { to: "/login", label: "Iniciar sesión" },
  { to: "/registro", label: "Crear cuenta" },
];

export default function AuthTabs() {
  return (
    <div className="segmented">
      {tabs.map(({ to, label }) => (
        <NavLink key={to} to={to} replace>
          {label}
        </NavLink>
      ))}
    </div>
  );
}
