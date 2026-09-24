import { useMemo } from "react";
import type { CSSProperties } from "react";

interface MonthSwitcherProps {
  month: string; // 'YYYY-MM'
  onChange: (month: string) => void;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  const label = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${year}`;
  }, [month]);

  const isCurrentMonth = month === currentMonth();

  return (
    <div
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
      }}
    >
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mes anterior"
        style={arrowStyle}
      >
        ‹
      </button>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrentMonth}
        aria-label="Mes siguiente"
        style={{
          ...arrowStyle,
          opacity: isCurrentMonth ? 0.3 : 1,
          cursor: isCurrentMonth ? "default" : "pointer",
        }}
      >
        ›
      </button>
    </div>
  );
}

const arrowStyle: CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  width: 32,
  height: 32,
  borderRadius: "50%",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
