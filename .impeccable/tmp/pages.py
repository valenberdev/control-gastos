import os
os.chdir('C:/Users/valen/Desktop/control-gastos/apps/web/src')


def cut(p, start_marker, new):
    s = open(p, encoding='utf-8').read()
    i = s.index(start_marker)
    s = s[:i] + new
    open(p, 'w', encoding='utf-8').write(s)


# ---- Login
cut('pages/Login.tsx', '  return (\n    <div\n      style={{\n        minHeight', '''  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <AuthTabs />

        <div className="auth-head">
          <h1>Bienvenido de nuevo</h1>
          <span>Ingresá con tu email y contraseña.</span>
        </div>

        <label className="field">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="field">
          Contraseña
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
        </label>

        {error && <span className="form-error">{error}</span>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
''')

# ---- Register
cut('pages/Register.tsx', '  return (\n    <div\n      style={{\n        minHeight', '''  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <AuthTabs />

        <div className="auth-head">
          <h1>Creá tu cuenta</h1>
          <span>
            Registrate con tu email para empezar a controlar tus gastos.
          </span>
        </div>

        <label className="field">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="field">
          Contraseña
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            Mínimo 8 caracteres.
          </span>
        </label>

        {error && <span className="form-error">{error}</span>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
''')

# ---- Profile
cut('pages/Profile.tsx', '  return (\n    <div className="page-container">', '''  return (
    <div className="page-container">
      <h1 className="page-title">Perfil</h1>

      <div className="card stack-sm">
        <span className="mod-title">Cuenta</span>
        <span className="account-email">{user?.email}</span>
      </div>

      <div className="card row-between">
        <span className="mod-title">Tema claro</span>
        <ThemeToggle />
      </div>

      <TimezoneSetting />

      <div className="card stack">
        <span className="mod-title">Vincular Telegram</span>
        <span className="mod-meta">
          Generá un código y mandaselo al bot con <code>/vincular</code>.
        </span>

        {linkCode && !expired && (
          <div className="link-code">
            <span className="fig">{linkCode.code}</span>
            <span className="mod-meta">
              Expira en {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}

        {expired && <span className="form-error">El código expiró.</span>}
        {error && <span className="form-error">{error}</span>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
        >
          {generating
            ? "Generando..."
            : linkCode
              ? "Generar otro código"
              : "Generar código"}
        </button>
      </div>

      <button onClick={logout} className="btn-secondary">
        Cerrar sesión
      </button>
    </div>
  );
}
''')

# ---- Historial
p = 'pages/Historial.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace('''      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--expense)" }}>
          No se pudo conectar con la API. Revisá que esté corriendo.
        </p>
      </div>''', '''      <div className="state-error">
        <p>No se pudo conectar con la API. Revisá que esté corriendo.</p>
      </div>''')
s = s.replace('<h1 style={{ fontSize: 20 }}>Historial</h1>', '<h1 className="page-title">Historial</h1>')
open(p, 'w', encoding='utf-8').write(s)

# ---- Dashboard
p = 'pages/Dashboard.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace('''      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--expense)" }}>
          No se pudo conectar con la API. Revisá que esté corriendo.
        </p>
      </div>''', '''      <div className="state-error">
        <p>No se pudo conectar con la API. Revisá que esté corriendo.</p>
      </div>''')
old = s[s.index('      <div className="dashboard-grid">'):s.index('      <button\n        className="fab"')]
new = '''      <div className="dashboard-grid">
        <div className="area-balance">
          {balance && <BalanceCard data={balance} />}
        </div>
        <div className="col-main">
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
      </div>

'''
s = s.replace(old, new)
s = s.replace('strokeLinecap="round"', 'strokeLinecap="square"')
open(p, 'w', encoding='utf-8').write(s)

# ---- TimezoneSetting
p = 'components/TimezoneSetting.tsx'
s = open(p, encoding='utf-8').read()
i = s.index('  return (\n    <div\n      className="card"')
s = s[:i] + '''  return (
    <div className="card stack">
      <span className="mod-title">Zona horaria</span>

      <select
        value={timezone ?? ""}
        disabled={timezone === null || saving}
        onChange={(e) => save(e.target.value)}
        aria-label="Zona horaria"
        className="field-input field-select"
      >
        {timezone === null && <option value="">Cargando...</option>}
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      {timezone !== null && timezone !== deviceTimezone && (
        <button
          onClick={() => save(deviceTimezone)}
          disabled={saving}
          className="link-button"
        >
          Usar la de este dispositivo ({deviceTimezone.replace(/_/g, " ")})
        </button>
      )}

      <span className="mod-meta">
        Define qué día es "hoy" al cargar movimientos. Los ya cargados no
        cambian.
      </span>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
'''
open(p, 'w', encoding='utf-8').write(s)
print('ok')
