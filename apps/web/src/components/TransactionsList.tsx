import type { CSSProperties } from "react";
import type { Expense, Income, Category } from "../types";

export interface EditableTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  categoryId?: string;
}

interface TransactionsListProps {
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  limit?: number;
  editable?: boolean;
  onEdit?: (transaction: EditableTransaction) => void;
  onDelete?: (transaction: EditableTransaction) => void;
}

interface Transaction extends EditableTransaction {
  label: string;
  date: string;
  created_at: string;
}

const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function PencilIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export default function TransactionsList({
  expenses,
  incomes,
  categories,
  limit = 8,
  editable = false,
  onEdit,
  onDelete,
}: TransactionsListProps) {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  const transactions: Transaction[] = [
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      amount: e.amount,
      description: e.description,
      categoryId: e.category_id,
      label:
        e.description || capitalize(nameById.get(e.category_id) ?? "Otros"),
      date: e.expense_date,
      created_at: e.created_at,
    })),
    ...incomes.map((i) => ({
      id: i.id,
      type: "income" as const,
      amount: i.amount,
      description: i.description,
      label: i.description || "Ingreso",
      date: i.income_date,
      created_at: i.created_at,
    })),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);

  if (transactions.length === 0) {
    return (
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
        }}
      >
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Todavía no hay movimientos.
        </span>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 4 }}
    >
      <span style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
        Últimos movimientos
      </span>
      {transactions.map((t, idx) => (
        <div
          key={`${t.type}-${t.id}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom:
              idx === transactions.length - 1
                ? "none"
                : "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14 }}>{t.label}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {dateFormatter.format(parseDateOnly(t.date))}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: t.type === "income" ? "var(--income)" : "var(--expense)",
              }}
            >
              {t.type === "income" ? "+" : "-"}
              {formatter.format(t.amount)}
            </span>
            {editable && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(t)}
                  aria-label="Editar"
                  style={actionButtonStyle}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(t)}
                  aria-label="Borrar"
                  style={actionButtonStyle}
                >
                  <TrashIcon />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const actionButtonStyle: CSSProperties = {
  border: "none",
  background: "none",
  padding: 4,
  display: "flex",
  color: "var(--text-muted)",
  cursor: "pointer",
};
