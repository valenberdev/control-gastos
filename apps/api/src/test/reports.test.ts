import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { APP_TIMEZONE } from "../config/timezone.js";
import {
  addDays,
  api,
  auth,
  closePool,
  createUser,
  firstOfMonth,
  insertExpense,
  insertIncome,
  mondayOf,
  resetDb,
  today,
  type TestUser,
} from "./helpers.js";

beforeEach(resetDb);
afterAll(closePool);

interface Point {
  bucket: string;
  income: number;
  expenses: number;
}

async function trend(user: TestUser, period?: string): Promise<Point[]> {
  const path =
    period === undefined ? "/reports/trend" : `/reports/trend?period=${period}`;
  const res = await api.get(path).set(auth(user));
  expect(res.status).toBe(200);
  return res.body;
}

describe("GET /balance", () => {
  it("una cuenta nueva empieza en cero", async () => {
    const user = await createUser();

    const res = await api.get("/balance").set(auth(user));

    expect(res.body).toEqual({ balance: 0, totalIncome: 0, totalExpenses: 0 });
  });

  it("resta sin errores de coma flotante (0,30 - 0,10 es exactamente 0,20)", async () => {
    const user = await createUser();
    const hoy = today(APP_TIMEZONE);
    await insertIncome(user, 0.3, hoy);
    await insertExpense(user, 0.1, hoy);

    const res = await api.get("/balance").set(auth(user));

    expect(res.body).toEqual({
      balance: 0.2,
      totalIncome: 0.3,
      totalExpenses: 0.1,
    });
  });
});

describe("GET /reports/trend", () => {
  it.each([
    ["day", 14],
    ["week", 8],
    ["month", 6],
  ])(
    "period=%s devuelve %i puntos, en orden, sin repetir y con ceros",
    async (period, count) => {
      const user = await createUser();

      const points = await trend(user, period);
      const buckets = points.map((p) => p.bucket);

      expect(points).toHaveLength(count);
      expect(points.every((p) => p.income === 0 && p.expenses === 0)).toBe(
        true,
      );
      expect(buckets).toEqual([...buckets].sort());
      expect(new Set(buckets).size).toBe(count);
    },
  );

  it("sin parámetro devuelve los últimos 6 meses y el último es el mes actual", async () => {
    const user = await createUser();

    const points = await trend(user);

    expect(points).toHaveLength(6);
    expect(points.at(-1)!.bucket).toBe(firstOfMonth(today(APP_TIMEZONE)));
  });

  it.each(["", "year", "constructor", "DAY"])(
    "un period inválido (%j) cae a meses",
    async (period) => {
      const user = await createUser();

      const points = await trend(user, period);

      expect(points).toHaveLength(6);
    },
  );

  it("por día: cada movimiento cae en su día", async () => {
    const user = await createUser();
    const hoy = today(APP_TIMEZONE);
    const ayer = addDays(hoy, -1);
    await insertExpense(user, 100, hoy);
    await insertExpense(user, 25, hoy);
    await insertExpense(user, 40, ayer);
    await insertIncome(user, 1000, hoy);

    const points = await trend(user, "day");

    expect(points.at(-1)).toEqual({ bucket: hoy, income: 1000, expenses: 125 });
    expect(points.at(-2)).toEqual({ bucket: ayer, income: 0, expenses: 40 });
  });

  it("por semana: las semanas empiezan el lunes", async () => {
    const user = await createUser();
    const lunes = mondayOf(today(APP_TIMEZONE));
    await insertExpense(user, 7, lunes);
    await insertExpense(user, 3, addDays(lunes, -1));

    const points = await trend(user, "week");

    expect(points.at(-1)).toEqual({ bucket: lunes, income: 0, expenses: 7 });
    expect(points.at(-2)).toEqual({
      bucket: addDays(lunes, -7),
      income: 0,
      expenses: 3,
    });
  });

  it("por mes: el último día de un mes y el primero del siguiente van a buckets distintos", async () => {
    const user = await createUser();
    const hoy = today(APP_TIMEZONE);
    const primero = firstOfMonth(hoy);
    const ultimoDelAnterior = addDays(primero, -1);
    await insertExpense(user, 10, ultimoDelAnterior);
    await insertExpense(user, 20, primero);
    await insertExpense(user, 5, hoy);

    const points = await trend(user, "month");

    expect(points.at(-1)).toEqual({ bucket: primero, income: 0, expenses: 25 });
    expect(points.at(-2)).toEqual({
      bucket: firstOfMonth(ultimoDelAnterior),
      income: 0,
      expenses: 10,
    });
  });

  it('cada usuario ve "hoy" según su zona horaria', async () => {
    const kiritimati = await createUser({ timezone: "Pacific/Kiritimati" });
    const pagoPago = await createUser({ timezone: "Pacific/Pago_Pago" });

    const [enKiritimati, enPagoPago] = await Promise.all([
      trend(kiritimati, "day"),
      trend(pagoPago, "day"),
    ]);

    expect(enKiritimati.at(-1)!.bucket).toBe(today("Pacific/Kiritimati"));
    expect(enPagoPago.at(-1)!.bucket).toBe(today("Pacific/Pago_Pago"));
    expect(enKiritimati.at(-1)!.bucket).not.toBe(enPagoPago.at(-1)!.bucket);
  });

  it("cada usuario ve solo sus datos", async () => {
    const ana = await createUser();
    const beto = await createUser();
    await insertExpense(ana, 500, today(APP_TIMEZONE));

    const points = await trend(beto, "day");

    expect(points.every((p) => p.income === 0 && p.expenses === 0)).toBe(true);
  });
});

describe("GET /reports/trend: borde de la ventana", () => {
  it("cuenta el primer día de la ventana y deja fuera lo anterior", async () => {
    const user = await createUser();
    const hoy = today(APP_TIMEZONE);
    const primerMes = addDays(firstOfMonth(hoy), 0);
    // El mes más antiguo de la ventana de 6 meses empieza 5 meses antes del actual.
    const [y, m] = primerMes.split("-").map(Number);
    const inicio = new Date(Date.UTC(y, m - 1 - 5, 1)).toISOString().slice(0, 10);
    await insertExpense(user, 11, inicio);
    await insertExpense(user, 99, addDays(inicio, -1));
    await insertIncome(user, 500, inicio);
    await insertIncome(user, 900, addDays(inicio, -1));

    const points = await trend(user, "month");

    expect(points[0]).toEqual({ bucket: inicio, income: 500, expenses: 11 });
    expect(points.reduce((s, p) => s + p.expenses, 0)).toBe(11);
    expect(points.reduce((s, p) => s + p.income, 0)).toBe(500);
  });

  it("por día: lo de hace más de 14 días no aparece", async () => {
    const user = await createUser();
    const hoy = today(APP_TIMEZONE);
    await insertExpense(user, 5, addDays(hoy, -13));
    await insertExpense(user, 70, addDays(hoy, -14));

    const points = await trend(user, "day");

    expect(points[0]).toEqual({
      bucket: addDays(hoy, -13),
      income: 0,
      expenses: 5,
    });
    expect(points.reduce((s, p) => s + p.expenses, 0)).toBe(5);
  });
});
