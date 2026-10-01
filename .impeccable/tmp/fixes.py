import os
os.chdir('C:/Users/valen/Desktop/control-gastos/apps/web/src')


def sub(s, old, new, count=1):
    assert old in s, old[:60]
    return s.replace(old, new, count)


# ---------- Dashboard: DOM order == visual order (balance, trend, [month, donut], list)
p = 'pages/Dashboard.tsx'
s = open(p, encoding='utf-8').read()
a = s.index('      <div className="dashboard-grid">')
b = s.index('      <button\n        className="fab"')
s = s[:a] + '''      <div className="dashboard-grid">
        <div className="area-balance">
          {balance && <BalanceCard data={balance} />}
        </div>
        <div className="area-trend">
          {trend && (
            <TrendChart
              data={trend.points}
              dataPeriod={trend.period}
              selectedPeriod={period}
              onPeriodChange={setPeriod}
            />
          )}
        </div>
        <div className="col-side">
          <div className="area-month">
            <MonthSwitcher month={month} onChange={setMonth} />
          </div>
          <div className="area-donut">
            {!loading && (
              <CategoryDonut expenses={expenses} categories={categories} />
            )}
          </div>
        </div>
        <div className="area-list">
          {!loading && (
            <TransactionsList
              expenses={expenses}
              incomes={incomes}
              categories={categories}
            />
          )}
        </div>
      </div>

''' + s[b:]
open(p, 'w', encoding='utf-8').write(s)

# ---------- Register helper text: use the shared class
p = 'pages/Register.tsx'
s = open(p, encoding='utf-8').read()
s = sub(s, '<span style={{ fontSize: 13, fontWeight: 500 }}>\n            Mínimo 8 caracteres.\n          </span>', '<span className="mod-meta" style={{ fontWeight: 500 }}>\n            Mínimo 8 caracteres.\n          </span>')
open(p, 'w', encoding='utf-8').write(s)

# ---------- CSS
p = 'styles/theme.css'
c = open(p, encoding='utf-8').read()

# 1. placeholder contrast
c = sub(c, ".field-input::placeholder {\n  color: var(--text-muted);\n  opacity: 0.7;\n}", ".field-input::placeholder {\n  color: var(--text-muted);\n  opacity: 1;\n}")

# 2. layout: remove the order/contents machinery, new desktop grid
a = c.index('.col-main,\n.col-side {\n  display: contents;')
b = c.index('/* ------------------------------------------------------------------\n   Barra de marca')
c = c[:a] + '''.col-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (min-width: 900px) {
  .page-container {
    max-width: 760px;
    padding: 112px 32px 128px;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: start;
    column-gap: 24px;
    row-gap: 24px;
    max-width: 1120px;
    padding: 112px 32px 128px;
  }

  .dashboard-grid .area-balance {
    grid-column: 1 / -1;
  }

  .dashboard-grid .area-trend {
    grid-column: 1;
    grid-row: 2;
  }

  .dashboard-grid .col-side {
    grid-column: 2;
    grid-row: 2 / span 2;
    gap: 24px;
  }

  .dashboard-grid .area-list {
    grid-column: 1;
    grid-row: 3;
  }
}

''' + c[b:]

# 4. module header strip for the balance + caption order for the total
c = sub(c, ".balance-figure-wrap {\n  position: relative;", ".balance > .mod-title {\n  margin: 0 -20px;\n  padding: 10px 20px;\n  background: var(--surface-2);\n}\n\n.balance-figure-wrap {\n  position: relative;")
c = sub(c, "  padding: 16px 20px 0;\n  overflow: hidden;\n}", "  padding: 0 20px;\n  overflow: hidden;\n}")
c = sub(c, "  .balance > .mod-title {\n    grid-column: 1 / -1;\n    padding: 16px 24px 12px;\n  }", "  .balance > .mod-title {\n    grid-column: 1 / -1;\n    margin: 0;\n    padding: 12px 24px;\n  }")
c = sub(c, ".cat-total {\n  display: flex;\n  flex-direction: column;", ".cat-total {\n  display: flex;\n  flex-direction: column-reverse;")

# 5. tap targets
c = sub(c, ".trend-head .segmented > button {\n  min-height: 36px;\n  padding: 0 10px;\n  font-size: 12px;\n}", ".trend-head .segmented > button {\n  min-height: 44px;\n  padding: 0 10px;\n  font-size: 12px;\n}")
c = sub(c, "  width: 60px;\n  height: 32px;\n  padding: 0;", "  width: 68px;\n  height: 44px;\n  padding: 0;")
c = sub(c, "  top: 3px;\n  left: 3px;\n  width: 24px;\n  height: 24px;\n  background: var(--blue-fill);", "  top: 5px;\n  left: 5px;\n  width: 32px;\n  height: 32px;\n  background: var(--blue-fill);")
c = sub(c, "  transform: translateX(28px);", "  transform: translateX(24px);")
c = sub(c, ".icon-button {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 40px;\n  height: 40px;", ".icon-button {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 44px;\n  height: 44px;")
c = sub(c, "  max-width: 150px;\n}", "  max-width: 160px;\n}")

# 6. FAB: real chamfer
a = c.index('.fab::after {')
b = c.index('.fab:hover {')
c = c[:a] + c[b:]
c = sub(c, "  z-index: 15;\n  transition: background-color 0.15s ease, transform 0.15s var(--ease);\n}", "  z-index: 15;\n  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);\n  transition: background-color 0.15s ease, transform 0.15s var(--ease);\n}")

# 7. the slash on auth head and modal head; bigger auth title
SLASH = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230057ff' stroke-width='2.5'%3E%3Cpath d='M4 20L20 4'/%3E%3C/svg%3E\") center / contain no-repeat"
c = sub(c, ".auth-head h1 {
  font-size: 36px;", ".auth-head {
  position: relative;
}

.auth-head::after {
  content: '';
  position: absolute;
  right: 0;
  top: 2px;
  width: 30px;
  height: 30px;
  background: " + SLASH + ";
  pointer-events: none;
}

.movement-head::after {
  content: '';
  flex: none;
  width: 24px;
  height: 24px;
  margin-left: auto;
  order: 1;
  background: " + SLASH + ";
}

.movement-head .icon-button {
  order: 2;
}

.auth-head h1 {
  font-size: 40px;")
open(p, 'w', encoding='utf-8').write(c)
print('ok')
