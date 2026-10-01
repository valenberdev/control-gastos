import os
os.chdir('C:/Users/valen/Desktop/control-gastos/apps/web/src')


def rd(p):
    return open(p, encoding='utf-8').read()


def wr(p, s):
    open(p, 'w', encoding='utf-8').write(s)


def sub(s, old, new, count=1):
    assert old in s, old[:70]
    return s.replace(old, new, count)


# ---- hook: live prefers-reduced-motion
wr('hooks/useReducedMotion.ts', '''import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
''')

# ---- charts: live reduced motion + colours from tokens
s = rd('components/CategoryDonut.tsx')
s = sub(s, "import CategoryIcon, { CATEGORY_COLORS, categoryVars } from './CategoryIcon';", "import CategoryIcon, { CATEGORY_COLORS, categoryVars } from './CategoryIcon';\nimport { useReducedMotion } from '../hooks/useReducedMotion';")
a = s.index("const REDUCE_MOTION =")
b = s.index("\n", a)
s = s[:a] + s[b + 1:]
s = sub(s, "export default function CategoryDonut({ expenses, categories }: CategoryDonutProps) {\n", "export default function CategoryDonut({ expenses, categories }: CategoryDonutProps) {\n  const reduceMotion = useReducedMotion();\n")
s = sub(s, "isAnimationActive={!REDUCE_MOTION}", "isAnimationActive={!reduceMotion}")
wr('components/CategoryDonut.tsx', s)

s = rd('components/TrendChart.tsx')
s = sub(s, 'import type { TrendPoint, TrendPeriod } from "../types";', 'import type { TrendPoint, TrendPeriod } from "../types";\nimport { useReducedMotion } from "../hooks/useReducedMotion";')
s = sub(s, 'const REDUCE_MOTION =\n  typeof window !== "undefined" &&\n  window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n', '')
s = sub(s, "}: TrendChartProps) {\n", "}: TrendChartProps) {\n  const reduceMotion = useReducedMotion();\n")
s = s.replace("isAnimationActive={!REDUCE_MOTION}", "isAnimationActive={!reduceMotion}")
s = sub(s, '<stop offset="0%" stopColor="#2fbf5a" stopOpacity={0.38} />\n              <stop offset="100%" stopColor="#2fbf5a" stopOpacity={0} />',
        '<stop offset="0%" style={{ stopColor: "var(--income-fill)" }} stopOpacity={0.38} />\n              <stop offset="100%" style={{ stopColor: "var(--income-fill)" }} stopOpacity={0} />')
s = sub(s, '<stop offset="0%" stopColor="#ff4a40" stopOpacity={0.32} />\n              <stop offset="100%" stopColor="#ff4a40" stopOpacity={0} />',
        '<stop offset="0%" style={{ stopColor: "var(--expense-fill)" }} stopOpacity={0.32} />\n              <stop offset="100%" style={{ stopColor: "var(--expense-fill)" }} stopOpacity={0} />')
wr('components/TrendChart.tsx', s)

# ---- BalanceCard count-up also reads the live setting
s = rd('components/BalanceCard.tsx')
s = sub(s, "import type { Balance } from '../types';", "import type { Balance } from '../types';\nimport { useReducedMotion } from '../hooks/useReducedMotion';")
s = sub(s, "function useCountUp(target: number, duration = 700): number {\n", "function useCountUp(target: number, duration = 700): number {\n  const reduce = useReducedMotion();\n")
s = sub(s, "    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n    if (reduce) {", "    if (reduce) {")
s = sub(s, "  }, [target, duration]);", "  }, [target, duration, reduce]);")
wr('components/BalanceCard.tsx', s)

# ---- ledger: wrap row actions so they align under the amount
s = rd('components/TransactionsList.tsx')
s = sub(s, '''            {editable && (
              <>
                <button''', '''            {editable && (
              <div className="ledger-actions">
                <button''')
s = sub(s, '''                  <TrashIcon />
                </button>
              </>
            )}''', '''                  <TrashIcon />
                </button>
              </div>
            )}''')
wr('components/TransactionsList.tsx', s)

c = rd('styles/theme.css')
a = c.index("@media (max-width: 599px) {\n  .ledger-row.is-editable .ledger-end {")
b = c.index(".icon-button {")
c = c[:a] + '''.ledger-actions {
  display: flex;
  align-items: center;
}

@media (max-width: 599px) {
  .ledger-row.is-editable .ledger-end {
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
  }

  .ledger-row.is-editable .ledger-actions {
    margin: -2px -14px -8px 0;
  }
}

''' + c[b:]

# tinted balance pills
c = sub(c, ".balance-cell-head {", ".balance-cell:first-child {\n  background: linear-gradient(160deg, color-mix(in srgb, var(--income-fill) 18%, var(--glass-bg-strong)), var(--glass-bg-strong) 75%);\n}\n\n.balance-cell:last-child {\n  background: linear-gradient(160deg, color-mix(in srgb, var(--expense-fill) 16%, var(--glass-bg-strong)), var(--glass-bg-strong) 75%);\n}\n\n.balance-cell-head {")
wr('styles/theme.css', c)
print('ok')
