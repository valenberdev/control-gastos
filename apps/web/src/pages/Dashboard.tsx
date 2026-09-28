import { useEffect, useRef, useState } from "react";
import { get } from "../api/client";
import type {
  Balance,
  TrendPoint,
  TrendPeriod,
  Expense,
  Income,
  Category,
} from "../types";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import BalanceCard from "../components/BalanceCard";
import TrendChart from "../components/TrendChart";
import CategoryDonut from "../components/CategoryDonut";
import TransactionsList from "../components/TransactionsList";
import MonthSwitcher from "../components/MonthSwitcher";
import AddMovementModal from "../components/AddMovementModal";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface TrendState {
  period: TrendPeriod;
  points: TrendPoint[];
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [period, setPeriod] = useState<TrendPeriod>("month");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [trend, setTrend] = useState<TrendState | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const periodRef = useRef(period);
  periodRef.current = period;

  function fetchCategories() {
    get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setError(true));
  }

  function fetchBalance() {
    get<Balance>("/balance")
      .then(setBalance)
      .catch(() => setError(true));
  }

  function fetchTrend() {
    const requested = period;
    get<TrendPoint[]>(`/reports/trend?period=${requested}`)
      .then((points) => {
        if (requested === periodRef.current)
          setTrend({ period: requested, points });
      })
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

  function handleSaved() {
    fetchBalance();
    fetchTrend();
    if (month !== currentMonth()) {
      setMonth(currentMonth());
    } else {
      fetchMonthData();
    }
  }

  useEffect(() => {
    fetchCategories();
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchTrend();
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchMonthData().finally(() => setLoading(false));
  }, [month]);

  useAutoRefresh(() => {
    fetchBalance();
    fetchTrend();
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
    <>
      <div className="dashboard-grid">
        <div className="area-balance">
          {balance && <BalanceCard data={balance} />}
        </div>
        <div className="area-trend">
          {trend && (
            <TrendChart
              data={trend.points}
              dataPeriod={trend.period}
              selectedPeriod={period}
              onPeriodChange={setPeriod}
            />
          )}
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

      <button
        className="fab"
        onClick={() => setModalOpen(true)}
        aria-label="Agregar movimiento"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <AddMovementModal
        open={modalOpen}
        categories={categories}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
