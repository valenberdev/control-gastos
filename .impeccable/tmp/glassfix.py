import os
os.chdir('C:/Users/valen/Desktop/control-gastos/apps/web/src')


def rd(p):
    return open(p, encoding='utf-8').read()


def wr(p, s):
    open(p, 'w', encoding='utf-8').write(s)


def sub(s, old, new, count=1):
    assert old in s, old[:70]
    return s.replace(old, new, count)


c = rd('styles/theme.css')

# 1. lens easing with almost no overshoot
c = sub(c, "  --spring: cubic-bezier(0.34, 1.45, 0.64, 1);", "  --spring: cubic-bezier(0.34, 1.45, 0.64, 1);\n  --lens: cubic-bezier(0.34, 1.08, 0.5, 1);")
c = sub(c, "  transform: translateX(calc(var(--i) * 100%));\n  transition: transform 0.65s var(--spring);", "  transform: translateX(calc(var(--i) * 100%));\n  transition: transform 0.6s var(--lens);")
c = sub(c, "  transform: translateX(calc(var(--i) * 100%));\n  transition: transform 0.6s var(--spring);", "  transform: translateX(calc(var(--i) * 100%));\n  transition: transform 0.55s var(--lens);")

# 2. editable ledger rows on narrow screens: actions on a second line
c = sub(c, ".ledger-row.is-editable .ledger-end {\n  flex-wrap: wrap;\n  max-width: 160px;\n}\n\n.ledger-row.is-editable .ledger-amount {\n  flex-basis: 100%;\n}\n\n@media (min-width: 600px) {\n  .ledger-row.is-editable .ledger-end {\n    flex-wrap: nowrap;\n    max-width: none;\n  }\n\n  .ledger-row.is-editable .ledger-amount {\n    flex-basis: auto;\n  }\n}",
        "@media (max-width: 599px) {\n  .ledger-row.is-editable .ledger-end {\n    display: contents;\n  }\n\n  .ledger-row.is-editable .cat-icon {\n    grid-row: 1 / span 2;\n    align-self: start;\n  }\n\n  .ledger-row.is-editable .ledger-text {\n    grid-column: 2;\n    grid-row: 1;\n  }\n\n  .ledger-row.is-editable .ledger-amount {\n    grid-column: 3;\n    grid-row: 1;\n  }\n\n  .ledger-row.is-editable .icon-button:nth-of-type(1) {\n    grid-column: 2;\n    grid-row: 2;\n    justify-self: end;\n  }\n\n  .ledger-row.is-editable .icon-button:nth-of-type(2) {\n    grid-column: 3;\n    grid-row: 2;\n    justify-self: end;\n  }\n}")

# 3. performance: lighter blur on phones, drift + breathe only on large screens, no blur in keyframes
c = sub(c, "  -webkit-backdrop-filter: blur(30px) saturate(1.8);\n  backdrop-filter: blur(30px) saturate(1.8);\n}\n\n@supports not", "  -webkit-backdrop-filter: blur(22px) saturate(1.7);\n  backdrop-filter: blur(22px) saturate(1.7);\n}\n\n@media (min-width: 900px) {\n  .card,\n  .bottom-nav,\n  .bell-button,\n  .movement-dialog {\n    -webkit-backdrop-filter: blur(30px) saturate(1.8);\n    backdrop-filter: blur(30px) saturate(1.8);\n  }\n}\n\n@supports not")
c = sub(c, "  pointer-events: none;\n  will-change: transform;\n}", "  pointer-events: none;\n}")
c = sub(c, "  animation: drift-a 34s ease-in-out infinite alternate;\n}", "}")
c = sub(c, "  animation: drift-b 43s ease-in-out infinite alternate;\n}", "}")
c = sub(c, "@keyframes drift-a {", "@media (min-width: 900px) {\n  body::before {\n    will-change: transform;\n    animation: drift-a 34s ease-in-out infinite alternate;\n  }\n\n  body::after {\n    will-change: transform;\n    animation: drift-b 43s ease-in-out infinite alternate;\n  }\n}\n\n@keyframes drift-a {")
c = sub(c, "  filter: blur(8px);\n  animation: breathe 7s ease-in-out infinite alternate;\n  pointer-events: none;\n}", "  filter: blur(8px);\n  pointer-events: none;\n}\n\n@media (min-width: 900px) {\n  .balance::after {\n    animation: breathe 7s ease-in-out infinite alternate;\n  }\n}")
c = sub(c, "    transform: translateY(22px) scale(0.97);\n    filter: blur(8px);\n  }", "    transform: translateY(22px) scale(0.97);\n  }")

# 5. tracking
c = sub(c, "  line-height: 1;\n  letter-spacing: -0.045em;\n  white-space: nowrap;\n  color: var(--text);", "  line-height: 1;\n  letter-spacing: -0.035em;\n  white-space: nowrap;\n  color: var(--text);")

# 6. contrast of white-on-blue
c = sub(c, "  --accent-fill: #0a74ff;\n  --accent-fill-2: #4a97ff;", "  --accent-fill: #0a5fe0;\n  --accent-fill-2: #1470ee;")
c = sub(c, "  --accent-fill: #0a84ff;\n  --accent-fill-2: #4da0ff;", "  --accent-fill: #0a5fe0;\n  --accent-fill-2: #1470ee;")

# 8. polish
c = sub(c, "  padding: 14px 14px 14px;\n  border-radius: 22px;\n  background: var(--fill);\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 0 0 1px var(--hair);", "  padding: 14px 14px 14px;\n  border-radius: 22px;\n  background: var(--glass-bg-strong);\n  box-shadow: var(--glass-hl), 0 4px 14px -6px rgba(40, 60, 140, 0.18);")
c = sub(c, "    flex: 0 0 300px;\n    grid-template-columns: 1fr;\n    margin-top: -48px;\n  }", "    flex: 0 0 300px;\n    grid-template-columns: 1fr;\n  }")
c = sub(c, ".trend-head .segmented > button {\n  min-height: 40px;", ".trend-head .segmented > button {\n  min-height: 44px;")
wr('styles/theme.css', c)

# 4. + 5. JS-driven chart animations respect reduced motion; count-up only on first load, accessible figure
reduce = "typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches"

s = rd('components/CategoryDonut.tsx')
s = sub(s, "const FALLBACK_COLOR = '#7A7F93';", "const FALLBACK_COLOR = '#7A7F93';\nconst REDUCE_MOTION = " + reduce + ";")
s = sub(s, "              animationDuration={1100}", "              isAnimationActive={!REDUCE_MOTION}\n              animationDuration={1100}")
wr('components/CategoryDonut.tsx', s)

s = rd('components/TrendChart.tsx')
s = sub(s, 'const MUTED_COLOR = "var(--text-muted)";', 'const MUTED_COLOR = "var(--text-muted)";\nconst REDUCE_MOTION =\n  typeof window !== "undefined" &&\n  window.matchMedia("(prefers-reduced-motion: reduce)").matches;')
s = s.replace("            animationDuration={1200}", "            isAnimationActive={!REDUCE_MOTION}\n            animationDuration={1200}")
wr('components/TrendChart.tsx', s)

s = rd('components/BalanceCard.tsx')
s = sub(s, "function useCountUp(target: number, duration = 1100): number {\n  const [value, setValue] = useState(0);\n  const from = useRef(0);",
        "// El conteo solo se reproduce la primera vez que aparece el saldo en la sesión\nlet hasCounted = false;\n\nfunction useCountUp(target: number, duration = 700): number {\n  const [value, setValue] = useState(hasCounted ? target : 0);\n  const from = useRef(hasCounted ? target : 0);")
s = sub(s, "    const start = performance.now();\n    const origin = from.current;", "    hasCounted = true;\n    const start = performance.now();\n    const origin = from.current;")
s = sub(s, "          style={{ '--chars': finalText.length } as CSSProperties}\n          aria-label={finalText}\n        >", "          style={{ '--chars': finalText.length } as CSSProperties}\n          role=\"img\"\n          aria-label={finalText}\n        >")
wr('components/BalanceCard.tsx', s)
print('ok')
