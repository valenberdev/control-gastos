import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { TrendPoint } from "../types";

interface TrendChartProps {
  data: TrendPoint[];
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

function formatMonth(month: string): string {
  const [, m] = month.split("-");
  return MONTH_LABELS[Number(m) - 1];
}

export default function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }));

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <Legend color={INCOME_COLOR} label="Ingresos" />
        <Legend color={EXPENSE_COLOR} label="Gastos" />
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
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke={INCOME_COLOR}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expenses"
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
