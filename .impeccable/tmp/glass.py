import os, re, glob
os.chdir('C:/Users/valen/Desktop/control-gastos/apps/web/src')


def rd(p):
    return open(p, encoding='utf-8').read()


def wr(p, s):
    open(p, 'w', encoding='utf-8').write(s)


def sub(s, old, new):
    assert old in s, old[:70]
    return s.replace(old, new, 1)


# ---------------- BalanceCard (count-up is visual only; the final value is exact)
wr('components/BalanceCard.tsx', '''import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Balance } from '../types';

interface BalanceCardProps {
  data: Balance;
}

const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const next = origin + (target - origin) * eased;
      from.current = next;
      setValue(t === 1 ? target : Math.round(next));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function ArrowIcon({ direction }: { direction: 'down' | 'up' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === 'down' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'} />
    </svg>
  );
}

export default function BalanceCard({ data }: BalanceCardProps) {
  const shown = useCountUp(data.balance);
  const balanceText = formatter.format(shown);
  const finalText = formatter.format(data.balance);
  return (
    <div className="card balance">
      <span className="mod-title">Tu saldo total</span>
      <div className="balance-figure-wrap">
        <span
          className="balance-figure fig"
          style={{ '--chars': finalText.length } as CSSProperties}
          aria-label={finalText}
        >
          {balanceText}
        </span>
      </div>
      <div className="balance-split">
        <div className="balance-cell">
          <span className="balance-cell-head">
            <span className="mark-income">
              <ArrowIcon direction="down" />
            </span>
            Ingresos
          </span>
          <span className="fig is-income">{formatter.format(data.totalIncome)}</span>
        </div>
        <div className="balance-cell">
          <span className="balance-cell-head">
            <span className="mark-expense">
              <ArrowIcon direction="up" />
            </span>
            Gastos
          </span>
          <span className="fig is-expense">{formatter.format(data.totalExpenses)}</span>
        </div>
      </div>
    </div>
  );
}
''')

# ---------------- BottomNav: new mark, rounded icons
p = 'components/BottomNav.tsx'
s = rd(p)
a = s.index('function AppMark() {')
b = s.index('export default function BottomNav() {')
s = s[:a] + s[b:]
s = sub(s, '          <AppMark />', '          <AppMark className="app-mark" />')
s = sub(s, 'import NotificationBell from "./NotificationBell";', 'import NotificationBell from "./NotificationBell";\nimport AppMark from "./AppMark";')
wr(p, s)

# ---------------- CategoryDonut: ring with category colours + rows
wr('components/CategoryDonut.tsx', '''import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Expense, Category } from '../types';
import CategoryIcon, { CATEGORY_COLORS, categoryVars } from './CategoryIcon';

interface CategoryDonutProps {
  expenses: Expense[];
  categories: Category[];
}

const FALLBACK_COLOR = '#7A7F93';

const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export default function CategoryDonut({ expenses, categories }: CategoryDonutProps) {
  const data = useMemo(() => {
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    const totals = new Map<string, number>();

    for (const expense of expenses) {
      const name = nameById.get(expense.category_id) ?? 'otros';
      totals.set(name, (totals.get(name) ?? 0) + expense.amount);
    }

    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] ?? FALLBACK_COLOR }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="card card-empty" style={{ minHeight: 180 }}>
        <span>Todavía no hay gastos este mes.</span>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={62}
              outerRadius={84}
              paddingAngle={data.length > 1 ? 5 : 0}
              cornerRadius={9}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={1100}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span className="mod-meta">Total gastado</span>
          <span className="fig">{formatter.format(total)}</span>
        </div>
      </div>
      {data.map((entry) => (
        <div key={entry.name} className="cat-row" style={categoryVars(entry.name)}>
          <CategoryIcon name={entry.name} />
          <div className="cat-main">
            <span className="cat-name">{entry.name}</span>
            <div className="cat-bar">
              <i style={{ '--w': `${Math.max(3, (entry.value / total) * 100)}%` } as React.CSSProperties} />
            </div>
          </div>
          <span className="cat-amount fig">{formatter.format(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}
''')

# ---------------- TransactionsList: category squircle, text stack
p = 'components/TransactionsList.tsx'
s = rd(p)
s = sub(s, 'import type { Expense, Income, Category } from "../types";', 'import type { Expense, Income, Category } from "../types";\nimport CategoryIcon from "./CategoryIcon";')
s = sub(s, 'interface Transaction extends EditableTransaction {\n  label: string;', 'interface Transaction extends EditableTransaction {\n  iconName: string;\n  label: string;')
s = sub(s, '      categoryId: e.category_id,\n      label:', '      categoryId: e.category_id,\n      iconName: nameById.get(e.category_id) ?? "otros",\n      label:')
s = sub(s, '      description: i.description,\n      label: i.description || "Ingreso",', '      description: i.description,\n      iconName: "ingreso",\n      label: i.description || "Ingreso",')
s = sub(s, '''          <span className="ledger-date">
            {dateFormatter.format(parseDateOnly(t.date))}
          </span>
          <span className="ledger-label">{t.label}</span>''', '''          <CategoryIcon name={t.iconName} small />
          <div className="ledger-text">
            <span className="ledger-label">{t.label}</span>
            <span className="ledger-date">
              {dateFormatter.format(parseDateOnly(t.date))}
            </span>
          </div>''')
wr(p, s)

# ---------------- TrendChart: smooth glass area chart
p = 'components/TrendChart.tsx'
s = rd(p)
s = sub(s, '''import {
  LineChart,
  Line,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";''', '''import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";''')
s = sub(s, 'const INCOME_COLOR = "var(--blue)";\nconst EXPENSE_COLOR = "var(--expense)";', 'const INCOME_COLOR = "var(--income-fill)";\nconst EXPENSE_COLOR = "var(--expense-fill)";')
a = s.index('      <ResponsiveContainer width="100%" height={168}>')
b = s.index('function Legend')
s = s[:a] + '''      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 6, bottom: 0, left: 6 }}
        >
          <defs>
            <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2fbf5a" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#2fbf5a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4a40" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#ff4a40" stopOpacity={0} />
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
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

''' + s[b:]
s = sub(s, '''      <span
        className={kind === "income" ? "mark-income" : "mark-expense"}
        aria-hidden="true"
      />''', '''      <span
        className={kind === "income" ? "mark-income" : "mark-expense"}
        aria-hidden="true"
      />''')
wr(p, s)

# ---------------- Login / Register: app mark above the title
for p in ('pages/Login.tsx', 'pages/Register.tsx'):
    s = rd(p)
    s = sub(s, 'import AuthTabs from "../components/AuthTabs";', 'import AuthTabs from "../components/AuthTabs";\nimport AppMark from "../components/AppMark";')
    s = sub(s, '        <AuthTabs />\n', '        <AppMark className="auth-logo" />\n        <AuthTabs />\n')
    wr(p, s)

# ---------------- Rounded strokes everywhere
for p in glob.glob('components/*.tsx') + glob.glob('pages/*.tsx'):
    s = rd(p)
    n = s.replace('strokeLinecap="square"', 'strokeLinecap="round"').replace('strokeLinejoin="miter"', 'strokeLinejoin="round"')
    if n != s:
        wr(p, n)

# ---------------- theme colours for the new field
for p in ('../index.html', '../vite.config.ts', 'hooks/useTheme.ts'):
    s = rd(p)
    s = s.replace('#0A0F1E', '#05070F').replace('#FBFCFF', '#E9EDF7')
    wr(p, s)
print('ok')
