import { NavLink } from 'react-router';

const items = [
  { to: '/', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/historial', label: 'Historial', icon: HistoryIcon, end: false },
];

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function HistoryIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingTop: 10,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} style={{ textDecoration: 'none' }}>
          {({ isActive }) => {
            const color = isActive ? 'var(--accent)' : 'var(--text-muted)';
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Icon color={color} />
                <span style={{ fontSize: 12, color, fontWeight: isActive ? 700 : 500 }}>{label}</span>
              </div>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}