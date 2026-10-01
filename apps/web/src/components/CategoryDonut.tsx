import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Expense, Category } from '../types';
import CategoryIcon, { CATEGORY_COLORS, categoryVars } from './CategoryIcon';
import { useReducedMotion } from '../hooks/useReducedMotion';

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
  const reduceMotion = useReducedMotion();
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
              isAnimationActive={!reduceMotion}
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
