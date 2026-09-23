import type { Balance } from '../types';

interface BalanceCardProps {
  data: Balance;
}

const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export default function BalanceCard({ data }: BalanceCardProps) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tu saldo total</span>
      <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
        {formatter.format(data.balance)}
      </span>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--income)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Ingresos: {formatter.format(data.totalIncome)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--expense)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Gastos: {formatter.format(data.totalExpenses)}
          </span>
        </div>
      </div>
    </div>
  );
}