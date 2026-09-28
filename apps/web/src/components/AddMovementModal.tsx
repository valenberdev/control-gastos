import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { post } from "../api/client";
import type { Category } from "../types";

interface AddMovementModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

type MovementType = "expense" | "income";

const TYPE_OPTIONS: { value: MovementType; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];

const MAX_AMOUNT = 9_999_999_999.99;

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}

export default function AddMovementModal({
  open,
  categories,
  onClose,
  onSaved,
}: AddMovementModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setType("expense");
      setAmount("");
      setCategoryId(null);
      setDescription("");
      setError(null);
      dialog.showModal();
      amountRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const value = parseAmount(amount);
    if (value === null) {
      setError(
        "Ingresá un monto válido: solo números, con coma o punto para los centavos.",
      );
      return;
    }
    if (type === "expense" && !categoryId) {
      setError("Elegí una categoría.");
      return;
    }

    setSaving(true);
    try {
      const trimmed = description.trim();
      if (type === "expense") {
        await post("/expenses", {
          amount: value,
          categoryId,
          description: trimmed || undefined,
          source: "web",
        });
      } else {
        await post("/incomes", {
          amount: value,
          description: trimmed || undefined,
          source: "web",
        });
      }
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="movement-dialog"
      aria-labelledby="movement-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 id="movement-title" style={{ fontSize: 18 }}>
            Agregar movimiento
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={closeButtonStyle}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div
          role="group"
          aria-label="Tipo de movimiento"
          style={segmentedStyle}
        >
          {TYPE_OPTIONS.map(({ value, label }) => {
            const active = value === type;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setType(value);
                  setError(null);
                }}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label style={labelStyle}>
          Monto
          <input
            ref={amountRef}
            className="field-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: 28, fontWeight: 800 }}
          />
        </label>

        {type === "expense" && (
          <div style={labelStyle}>
            Categoría
            {categories.length === 0 ? (
              <span style={{ fontSize: 13 }}>Cargando categorías...</span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    aria-pressed={c.id === categoryId}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label style={labelStyle}>
          Descripción (opcional)
          <input
            className="field-input"
            type="text"
            autoComplete="off"
            maxLength={120}
            placeholder={type === "expense" ? "Almuerzo" : "Sueldo"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {error && (
          <span role="alert" style={{ color: "var(--expense)", fontSize: 13 }}>
            {error}
          </span>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving
            ? "Guardando..."
            : type === "expense"
              ? "Guardar gasto"
              : "Guardar ingreso"}
        </button>
      </form>
    </dialog>
  );
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--text-muted)",
};

const segmentedStyle: CSSProperties = {
  display: "flex",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 2,
  gap: 2,
};

const closeButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};
