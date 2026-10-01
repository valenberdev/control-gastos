import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TrendPoint, TrendPeriod } from "../types";
import { useReducedMotion } from "../hooks/useReducedMotion";

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

const INCOME_COLOR = "var(--income-fill)";
const EXPENSE_COLOR = "var(--expense-fill)";
const MUTED_COLOR = "var(--text-muted)";

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
  const reduceMotion = useReducedMotion();
  const chartData = data.map((point) => ({
    ...point,
    ...describeBucket(point.bucket, dataPeriod),
  }));

  return (
    <div className="card">
      <div className="trend-head">
        <div className="legend">
          <Legend kind="income" label="Ingresos" />
          <Legend kind="expense" label="Gastos" />
        </div>
        <div
          role="group"
          aria-label="Período del gráfico"
          className="segmented"
        >
          {PERIOD_OPTIONS.map(({ value, label }) => {
            const active = value === selectedPeriod;
            return (
              <button
                key={value}
                onClick={() => onPeriodChange(value)}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 6, bottom: 0, left: 6 }}
        >
          <defs>
            <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--income-fill)" }} stopOpacity={0.38} />
              <stop offset="100%" style={{ stopColor: "var(--income-fill)" }} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--expense-fill)" }} stopOpacity={0.32} />
              <stop offset="100%" style={{ stopColor: "var(--expense-fill)" }} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--hair)"
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
            tickMargin={10}
            tick={{ fill: MUTED_COLOR, fontSize: 12.5 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--hair)", strokeWidth: 2 }}
            contentStyle={{
              background: "var(--glass-bg-strong)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              fontSize: 13,
              fontFamily: "var(--font)",
              boxShadow: "var(--glass-shadow)",
              backdropFilter: "blur(20px)",
            }}
            labelStyle={{ color: "var(--text)", fontWeight: 700 }}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.tooltip ?? ""
            }
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Ingresos"
            stroke={INCOME_COLOR}
            strokeWidth={3}
            strokeLinecap="round"
            fill="url(#fill-income)"
            dot={false}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2.5 }}
            isAnimationActive={!reduceMotion}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Gastos"
            stroke={EXPENSE_COLOR}
            strokeWidth={3}
            strokeLinecap="round"
            fill="url(#fill-expense)"
            dot={false}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2.5 }}
            isAnimationActive={!reduceMotion}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ kind, label }: { kind: "income" | "expense"; label: string }) {
  return (
    <div className="legend-item">
      <span
        className={kind === "income" ? "mark-income" : "mark-expense"}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
