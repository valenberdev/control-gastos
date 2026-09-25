import { usePushSubscription } from "../hooks/usePushSubscription";

export default function NotificationBell() {
  const { status, toggle } = usePushSubscription();

  if (status === "unsupported") return null;

  const active = status === "subscribed";
  const color = active ? "var(--accent)" : "var(--text-muted)";

  return (
    <button
      onClick={toggle}
      disabled={status === "loading"}
      aria-label={
        active ? "Desactivar notificaciones" : "Activar notificaciones"
      }
      className="bell-button"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    </button>
  );
}
