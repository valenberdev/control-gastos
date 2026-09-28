import { useEffect, useMemo, useState } from "react";
import { get, patch } from "../api/client";

interface Me {
  id: string;
  email: string;
  timezone: string;
}

export default function TimezoneSetting() {
  const [timezone, setTimezone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<Me>("/auth/me")
      .then((me) => setTimezone(me.timezone))
      .catch(() => setError("No se pudo cargar la zona horaria."));
  }, []);

  const options = useMemo(() => {
    const supported = Intl.supportedValuesOf("timeZone");
    return timezone && !supported.includes(timezone)
      ? [timezone, ...supported]
      : supported;
  }, [timezone]);

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function save(next: string) {
    const previous = timezone;
    setTimezone(next);
    setError(null);
    setSaving(true);
    try {
      const result = await patch<{ timezone: string }>("/auth/timezone", {
        timezone: next,
      });
      setTimezone(result.timezone);
    } catch {
      setTimezone(previous);
      setError("No se pudo guardar la zona horaria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <span style={{ fontSize: 15 }}>Zona horaria</span>

      <select
        value={timezone ?? ""}
        disabled={timezone === null || saving}
        onChange={(e) => save(e.target.value)}
        style={selectStyle}
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
          style={linkButtonStyle}
        >
          Usar la de este dispositivo ({deviceTimezone.replace(/_/g, " ")})
        </button>
      )}

      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Define qué día es "hoy" al cargar movimientos. Los ya cargados no
        cambian.
      </span>

      {error && (
        <span style={{ fontSize: 13, color: "var(--expense)" }}>{error}</span>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--accent)",
  cursor: "pointer",
};
