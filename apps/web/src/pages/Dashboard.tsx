import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { Balance, TrendPoint, Expense, Income, Category } from "../types";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import BalanceCard from "../components/BalanceCard";
import TrendChart from "../components/TrendChart";
import CategoryDonut from "../components/CategoryDonut";
import TransactionsList from "../components/TransactionsList";
import MonthSwitcher from "../components/MonthSwitcher";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [balance, setBalance] = useState<Balance | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function fetchGlobal() {
    get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setError(true));
    get<Balance>("/balance")
      .then(setBalance)
      .catch(() => setError(true));
    get<TrendPoint[]>("/reports/trend?months=6")
      .then(setTrend)
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
    fetchGlobal();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMonthData().finally(() => setLoading(false));
  }, [month]);

  useAutoRefresh(() => {
    fetchGlobal();
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
    <div className="dashboard-grid">
      <div className="area-balance">
        {balance && <BalanceCard data={balance} />}
      </div>
      <div className="area-trend">
        {trend.length > 0 && <TrendChart data={trend} />}
      </div>
      <div className="area-month">
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>
      <div className="area-donut">
        {!loading && (
          <CategoryDonut expenses={expenses} categories={categories} />
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
  );
}
