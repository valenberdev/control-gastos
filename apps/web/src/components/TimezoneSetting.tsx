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
