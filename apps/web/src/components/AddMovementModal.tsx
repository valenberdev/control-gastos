import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { post, patch } from "../api/client";
import type { Category } from "../types";
import type { EditableTransaction } from "./TransactionsList";

interface AddMovementModalProps {
  open: boolean;
  categories: Category[];
  editing?: EditableTransaction | null;
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
  editing,
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
      if (editing) {
        setType(editing.type);
        setAmount(String(editing.amount));
        setCategoryId(editing.categoryId ?? null);
        setDescription(editing.description ?? "");
      } else {
        setType("expense");
        setAmount("");
        setCategoryId(null);
        setDescription("");
      }
      setError(null);
      dialog.showModal();
      amountRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, editing]);

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

      if (editing) {
        const path =
          editing.type === "expense"
            ? `/expenses/${editing.id}`
            : `/incomes/${editing.id}`;
        const body: Record<string, unknown> = {
          amount: value,
          description: trimmed || null,
        };
        if (editing.type === "expense") body.categoryId = categoryId;
        await patch(path, body);
      } else if (type === "expense") {
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
      <form onSubmit={handleSubmit} noValidate className="movement-form">
        <div className="movement-head">
          <h2 id="movement-title">
            {editing ? "Editar movimiento" : "Agregar movimiento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="icon-button"
            style={{ border: "1px solid var(--frame)" }}
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
          className="segmented"
        >
          {TYPE_OPTIONS.map(({ value, label }) => {
            const active = value === type;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                disabled={!!editing}
                onClick={() => {
                  if (editing) return;
                  setType(value);
                  setError(null);
                }}
                style={{ opacity: editing && !active ? 0.4 : 1 }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label className="field">
          Monto
          <input
            ref={amountRef}
            className="field-input amount-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        {type === "expense" && (
          <div className="field">
            Categoría
            {categories.length === 0 ? (
              <span style={{ fontSize: 13 }}>Cargando categorías...</span>
            ) : (
              <div className="chip-group">
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

        <label className="field">
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
          <span role="alert" className="form-error">
            {error}
          </span>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving
            ? "Guardando..."
            : editing
              ? "Guardar cambios"
              : type === "expense"
                ? "Guardar gasto"
                : "Guardar ingreso"}
        </button>
      </form>
    </dialog>
  );
}
