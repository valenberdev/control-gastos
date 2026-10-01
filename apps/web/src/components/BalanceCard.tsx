import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Balance } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface BalanceCardProps {
  data: Balance;
}

const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

// El conteo solo se reproduce la primera vez que aparece el saldo en la sesión
let hasCounted = false;

function useCountUp(target: number, duration = 700): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(hasCounted ? target : 0);
  const from = useRef(hasCounted ? target : 0);

  useEffect(() => {
    if (reduce) {
      from.current = target;
      setValue(target);
      return;
    }
    hasCounted = true;
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
  }, [target, duration, reduce]);

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
          role="img"
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
