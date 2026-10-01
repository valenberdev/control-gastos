import { useMemo } from "react";

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
    <div className="card month-switcher">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mes anterior"
        className="month-arrow"
      >
        <ChevronIcon direction="left" />
      </button>
      <span className="month-label">{label}</span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrentMonth}
        aria-label="Mes siguiente"
        className="month-arrow"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
