import { useEffect, useState } from "react";
import { get, del } from "../api/client";
import type { Expense, Income, Category } from "../types";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useRetryWhile } from "../hooks/useRetryWhile";
import { keepIfEqual } from "../lib/keepIfEqual";
import CardSkeleton from "../components/CardSkeleton";
import ConnectionNotice from "../components/ConnectionNotice";
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
  // true cuando los movimientos del mes mostrado ya llegaron.
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  function fetchCategories() {
    get<Category[]>("/categories")
      .then((c) => setCategories((prev) => keepIfEqual(prev, c)))
      .catch(() => setError(true));
  }

  function fetchMonthData() {
    return Promise.all([
      get<Expense[]>(`/expenses?month=${month}`),
      get<Income[]>(`/incomes?month=${month}`),
    ])
      .then(([e, i]) => {
        setExpenses((prev) => keepIfEqual(prev, e));
        setIncomes((prev) => keepIfEqual(prev, i));
        setReady(true);
        setError(false);
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setReady(false);
    fetchMonthData();
  }, [month]);

  useAutoRefresh(() => {
    fetchMonthData();
  });

  // Si falló, reintenta cada pocos segundos (el servidor gratuito tarda en despertar).
  useRetryWhile(error, () => {
    if (categories.length === 0) fetchCategories();
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

  return (
    <div className="page-container">
      {error && (
        <ConnectionNotice waking={!ready} onRetry={() => fetchMonthData()} />
      )}
      <h1 className="page-title">Historial</h1>
      <MonthSwitcher month={month} onChange={setMonth} />
      {ready ? (
        <TransactionsList
          expenses={expenses}
          incomes={incomes}
          categories={categories}
          limit={Infinity}
          editable
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <CardSkeleton height={320} label="Cargando movimientos" />
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
