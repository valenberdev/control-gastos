import { Suspense, lazy, useEffect, useRef, useState } from "react";
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
import { useRetryWhile } from "../hooks/useRetryWhile";
import { keepIfEqual } from "../lib/keepIfEqual";
import BalanceCard from "../components/BalanceCard";
import CardSkeleton from "../components/CardSkeleton";
import ConnectionNotice from "../components/ConnectionNotice";
import TransactionsList from "../components/TransactionsList";
import MonthSwitcher from "../components/MonthSwitcher";
import AddMovementModal from "../components/AddMovementModal";
import InstallPrompt from "../components/InstallPrompt";

const loadTrendChart = () => import("../components/TrendChart");
const loadCategoryDonut = () => import("../components/CategoryDonut");
const TrendChart = lazy(loadTrendChart);
const CategoryDonut = lazy(loadCategoryDonut);

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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const periodRef = useRef(period);
  periodRef.current = period;

  function fetchCategories() {
    get<Category[]>("/categories")
      .then((c) => setCategories((prev) => keepIfEqual(prev, c)))
      .catch(() => setError(true));
  }

  function fetchBalance() {
    get<Balance>("/balance")
      .then((b) => setBalance((prev) => keepIfEqual(prev, b)))
      .catch(() => setError(true));
  }

  function fetchTrend() {
    const requested = period;
    get<TrendPoint[]>(`/reports/trend?period=${requested}`)
      .then((points) => {
        if (requested === periodRef.current)
          setTrend((prev) =>
            prev && prev.period === requested
              ? keepIfEqual(prev, { period: requested, points })
              : { period: requested, points },
          );
      })
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
    // Pide el código de los gráficos en paralelo con los datos, sin esperar a la API.
    void loadTrendChart();
    void loadCategoryDonut();
    fetchCategories();
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchTrend();
  }, [period]);

  useEffect(() => {
    setReady(false);
    fetchMonthData();
  }, [month]);

  function refreshAll() {
    fetchBalance();
    fetchTrend();
    fetchMonthData();
  }

  useAutoRefresh(refreshAll);

  useRetryWhile(error, () => {
    if (categories.length === 0) fetchCategories();
    refreshAll();
  });

  return (
    <>
      {error && <ConnectionNotice waking={!balance} onRetry={refreshAll} />}
      <div className="dashboard-grid">
        <div className="area-balance">
          {balance ? (
            <BalanceCard data={balance} />
          ) : (
            <CardSkeleton height={150} label="Cargando saldo" />
          )}
        </div>
        <div className="area-trend">
          {trend ? (
            <Suspense
              fallback={<CardSkeleton height={290} label="Cargando gráfico" />}
            >
              <TrendChart
                data={trend.points}
                dataPeriod={trend.period}
                selectedPeriod={period}
                onPeriodChange={setPeriod}
              />
            </Suspense>
          ) : (
            <CardSkeleton height={290} label="Cargando gráfico" />
          )}
        </div>
        <div className="col-side">
          <div className="area-month">
            <MonthSwitcher month={month} onChange={setMonth} />
          </div>
          <div className="area-donut">
            {ready ? (
              <Suspense
                fallback={
                  <CardSkeleton height={260} label="Cargando categorías" />
                }
              >
                <CategoryDonut expenses={expenses} categories={categories} />
              </Suspense>
            ) : (
              <CardSkeleton height={260} label="Cargando categorías" />
            )}
          </div>
        </div>
        <div className="area-list">
          {ready ? (
            <TransactionsList
              expenses={expenses}
              incomes={incomes}
              categories={categories}
            />
          ) : (
            <CardSkeleton height={320} label="Cargando movimientos" />
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

      <InstallPrompt />

      <AddMovementModal
        open={modalOpen}
        categories={categories}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
