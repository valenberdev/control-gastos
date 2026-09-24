import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { Expense, Income, Category } from "../types";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import MonthSwitcher from "../components/MonthSwitcher";
import TransactionsList from "../components/TransactionsList";

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
        />
      )}
    </div>
  );
}
