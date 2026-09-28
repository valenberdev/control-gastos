import { NavLink } from "react-router";

const tabs = [
  { to: "/login", label: "Iniciar sesión" },
  { to: "/registro", label: "Crear cuenta" },
];

export default function AuthTabs() {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 4,
        gap: 4,
      }}
    >
      {tabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          replace
          style={({ isActive }) => ({
            flex: 1,
            textAlign: "center",
            padding: "8px 0",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            background: isActive ? "var(--accent)" : "transparent",
            color: isActive ? "#fff" : "var(--text-muted)",
          })}
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
