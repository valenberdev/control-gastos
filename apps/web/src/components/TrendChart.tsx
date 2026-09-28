import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { TrendPoint, TrendPeriod } from "../types";

interface TrendChartProps {
  data: TrendPoint[];
  dataPeriod: TrendPeriod;
  selectedPeriod: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
}

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const INCOME_COLOR = "#34D399";
const EXPENSE_COLOR = "#F45B69";
const MUTED_COLOR = "#8A8A94";

const PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

function describeBucket(
  bucket: string,
  period: TrendPeriod,
): { label: string; tooltip: string } {
  const [year, month, day] = bucket.split("-").map(Number);
  const monthLabel = MONTH_LABELS[month - 1];

  if (period === "month")
    return { label: monthLabel, tooltip: `${monthLabel} ${year}` };
  if (period === "week")
    return { label: `${day}/${month}`, tooltip: `Semana del ${day}/${month}` };
  return { label: String(day), tooltip: `${day}/${month}` };
}

export default function TrendChart({
  data,
  dataPeriod,
  selectedPeriod,
  onPeriodChange,
}: TrendChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    ...describeBucket(point.bucket, dataPeriod),
  }));

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          <Legend color={INCOME_COLOR} label="Ingresos" />
          <Legend color={EXPENSE_COLOR} label="Gastos" />
        </div>
        <div
          role="group"
          aria-label="Período del gráfico"
          style={{
            display: "flex",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 2,
            gap: 2,
          }}
        >
          {PERIOD_OPTIONS.map(({ value, label }) => {
            const active = value === selectedPeriod;
            return (
              <button
                key={value}
                onClick={() => onPeriodChange(value)}
                aria-pressed={active}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
        >
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
            tick={{ fill: MUTED_COLOR, fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text)" }}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.tooltip ?? ""
            }
          />
          <Line
            type="monotone"
            dataKey="income"
            name="Ingresos"
            stroke={INCOME_COLOR}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name="Gastos"
            stroke={EXPENSE_COLOR}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{ width: 8, height: 8, borderRadius: "50%", background: color }}
      />
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
