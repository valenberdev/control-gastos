import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Expense, Category } from '../types';

interface CategoryDonutProps {
  expenses: Expense[];
  categories: Category[];
}

const PALETTE: Record<string, string> = {
  comida: '#F45B69',
  transporte: '#FBBF24',
  entretenimiento: '#A78BFA',
  salud: '#38BDF8',
  servicios: '#FB923C',
  otros: '#6B7280',
};
const FALLBACK_COLOR = '#6B7280';

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
      .map(([name, value]) => ({ name, value, color: PALETTE[name] ?? FALLBACK_COLOR }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Todavía no hay gastos este mes.</span>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={55} outerRadius={75} paddingAngle={2} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total gastado</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{formatter.format(total)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
              <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{entry.name}</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatter.format(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}