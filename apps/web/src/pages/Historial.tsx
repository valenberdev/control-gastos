import { useEffect, useState } from "react";
import { get, del } from "../api/client";
import type { Expense, Income, Category } from "../types";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import MonthSwitcher from "../components/MonthSwitcher";
import TransactionsList from "../components/TransactionsList";
import type { EditableTransaction } from "../components/TransactionsList";
import AddMovementModal from "../components/AddMovementModal";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Historial() {
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  function fetchCategories() {
    get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setError(true));
  }

  function fetchMonthData() {
    return Promise.all([
      get<Expense[]>(`/expenses?month=${month}`),
      get<Income[]>(`/incomes?month=${month}`),
    ])
      .then(([e, i]) => {
        setExpenses(e);
        setIncomes(i);
        setError(false);
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMonthData().finally(() => setLoading(false));
  }, [month]);

  useAutoRefresh(() => {
    fetchCategories();
    fetchMonthData();
  });

  function openEdit(t: EditableTransaction) {
    setEditing(t);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(t: EditableTransaction) {
    if (!window.confirm("¿Borrar este movimiento? No se puede deshacer."))
      return;
    try {
      const path =
        t.type === "expense" ? `/expenses/${t.id}` : `/incomes/${t.id}`;
      await del(path);
      fetchMonthData();
    } catch {
      window.alert("No se pudo borrar. Probá de nuevo.");
    }
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--expense)" }}>
          No se pudo conectar con la API. Revisá que esté corriendo.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 style={{ fontSize: 20 }}>Historial</h1>
      <MonthSwitcher month={month} onChange={setMonth} />
      {!loading && (
        <TransactionsList
          expenses={expenses}
          incomes={incomes}
          categories={categories}
          limit={Infinity}
          editable
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <AddMovementModal
        open={modalOpen}
        categories={categories}
        editing={editing}
        onClose={closeModal}
        onSaved={fetchMonthData}
      />
    </div>
  );
}
