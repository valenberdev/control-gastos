import type { Expense, Income, Category } from "../types";

interface TransactionsListProps {
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  limit?: number;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TransactionsList({
  expenses,
  incomes,
  categories,
  limit = 8,
}: TransactionsListProps) {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  const transactions: Transaction[] = [
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      amount: e.amount,
      label:
        e.description || capitalize(nameById.get(e.category_id) ?? "Otros"),
      date: e.expense_date,
      created_at: e.created_at,
    })),
    ...incomes.map((i) => ({
      id: i.id,
      type: "income" as const,
      amount: i.amount,
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
              {dateFormatter.format(new Date(t.date))}
            </span>
          </div>
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
        </div>
      ))}
    </div>
  );
}
