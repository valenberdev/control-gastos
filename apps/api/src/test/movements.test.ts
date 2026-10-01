import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../db/pool.js";
import {
  api,
  auth,
  categoryId,
  closePool,
  createUser,
  insertExpense,
  insertIncome,
  resetDb,
  today,
  type TestUser,
} from "./helpers.js";

beforeEach(resetDb);
afterAll(closePool);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MISSING_UUID = "00000000-0000-4000-8000-000000000000";
const INVALID_MONTHS = [
  "abc",
  "2026-13",
  "2026-00",
  "2026-9",
  "2026-09-01",
  "1899-12",
  "0000-01",
];

async function createExpense(
  user: TestUser,
  body: Record<string, unknown> = {},
) {
  return api
    .post("/expenses")
    .set(auth(user))
    .send({
      amount: 100,
      categoryId: await categoryId(),
      source: "web",
      ...body,
    });
}

async function createIncome(
  user: TestUser,
  body: Record<string, unknown> = {},
) {
  return api
    .post("/incomes")
    .set(auth(user))
    .send({ amount: 1000, source: "web", ...body });
}

describe("POST /expenses", () => {
  it("crea el gasto, con el monto como número y la fecha como AAAA-MM-DD", async () => {
    const user = await createUser();
    const category = await categoryId("comida");

    const res = await createExpense(user, {
      amount: 1500.5,
      categoryId: category,
      description: "almuerzo",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amount: 1500.5,
      category_id: category,
      description: "almuerzo",
      source: "web",
    });
    expect(res.body.expense_date).toMatch(DATE_ONLY);
  });

  it("la descripción es opcional", async () => {
    const user = await createUser();

    const res = await createExpense(user);

    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
  });

  it("la fecha es el día de hoy en la zona horaria de cada usuario", async () => {
    const zones = ["Pacific/Kiritimati", "Pacific/Pago_Pago"];
    const dates: string[] = [];

    for (const timezone of zones) {
      const user = await createUser({ timezone });
      const before = today(timezone);
      const res = await createExpense(user);
      const after = today(timezone);

      expect([before, after]).toContain(res.body.expense_date);
      dates.push(res.body.expense_date);
    }

    expect(dates[0]).not.toBe(dates[1]);
  });

  it.each([
    ["monto en cero", { amount: 0 }],
    ["monto negativo", { amount: -5 }],
    ["monto como texto", { amount: "100" }],
    ["monto por encima del máximo", { amount: 10_000_000_000 }],
    ["sin monto", { amount: undefined }],
    ["categoría que no es un UUID", { categoryId: "comida" }],
    ["sin categoría", { categoryId: undefined }],
    ["origen desconocido", { source: "api" }],
  ])("rechaza datos inválidos: %s", async (_caso, overrides) => {
    const user = await createUser();

    const res = await createExpense(user, overrides);

    expect(res.status).toBe(400);
  });

  it("una categoría que no existe da 400, no un error de servidor", async () => {
    const user = await createUser();

    const res = await createExpense(user, { categoryId: MISSING_UUID });

    expect(res.status).toBe(400);
  });
});

describe("GET /expenses", () => {
  it("con ?month= devuelve solo ese mes, del más nuevo al más viejo, incluidos los bordes", async () => {
    const user = await createUser();
    await insertExpense(user, 1, "2026-08-31");
    await insertExpense(user, 2, "2026-09-01");
    await insertExpense(user, 3, "2026-09-30");
    await insertExpense(user, 4, "2026-10-01");

    const res = await api.get("/expenses?month=2026-09").set(auth(user));

    expect(res.status).toBe(200);
    expect(
      res.body.map((e: { expense_date: string }) => e.expense_date),
    ).toEqual(["2026-09-30", "2026-09-01"]);
    expect(res.body.map((e: { amount: number }) => e.amount)).toEqual([3, 2]);
  });

  it.each(INVALID_MONTHS)(
    "rechaza el mes inválido %j con 400",
    async (month) => {
      const user = await createUser();

      const res = await api.get(`/expenses?month=${month}`).set(auth(user));

      expect(res.status).toBe(400);
    },
  );

  it("rechaza un mes repetido en la URL", async () => {
    const user = await createUser();

    const res = await api
      .get("/expenses?month=2026-09&month=2026-10")
      .set(auth(user));

    expect(res.status).toBe(400);
  });

  it("sin ?month= devuelve como máximo los últimos 100, del más nuevo al más viejo", async () => {
    const user = await createUser();
    await pool.query(
      `INSERT INTO expenses (user_id, amount, category_id, source, expense_date)
       SELECT $1::uuid, 1, (SELECT id FROM categories WHERE name = 'comida'), 'web', DATE '2026-01-01' + g
       FROM generate_series(1, 105) AS g`,
      [user.id],
    );

    const res = await api.get("/expenses").set(auth(user));
    const dates: string[] = res.body.map(
      (e: { expense_date: string }) => e.expense_date,
    );

    expect(res.body).toHaveLength(100);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("PATCH /expenses/:id", () => {
  it("actualiza monto, categoría y descripción, y deja la fecha como estaba", async () => {
    const user = await createUser();
    const created = await createExpense(user, { description: "original" });
    const salud = await categoryId("salud");

    const res = await api
      .patch(`/expenses/${created.body.id}`)
      .set(auth(user))
      .send({ amount: 250.75, categoryId: salud, description: "cambiado" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      amount: 250.75,
      category_id: salud,
      description: "cambiado",
    });
    expect(res.body.expense_date).toBe(created.body.expense_date);
  });

  it("con description null borra la descripción", async () => {
    const user = await createUser();
    const created = await createExpense(user, { description: "original" });

    const res = await api
      .patch(`/expenses/${created.body.id}`)
      .set(auth(user))
      .send({ description: null });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
  });

  it.each([
    ["sin campos", {}],
    ["monto inválido", { amount: -1 }],
    ["categoría que no es un UUID", { categoryId: "x" }],
    ["descripción que no es texto", { description: 5 }],
  ])("rechaza: %s", async (_caso, body) => {
    const user = await createUser();
    const created = await createExpense(user);

    const res = await api
      .patch(`/expenses/${created.body.id}`)
      .set(auth(user))
      .send(body);

    expect(res.status).toBe(400);
  });

  it("una categoría que no existe da 400", async () => {
    const user = await createUser();
    const created = await createExpense(user);

    const res = await api
      .patch(`/expenses/${created.body.id}`)
      .set(auth(user))
      .send({ categoryId: MISSING_UUID });

    expect(res.status).toBe(400);
  });

  it("un gasto que no existe da 404", async () => {
    const user = await createUser();

    const res = await api
      .patch(`/expenses/${MISSING_UUID}`)
      .set(auth(user))
      .send({ amount: 5 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /expenses/:id", () => {
  it("borra el gasto y deja de aparecer; repetirlo da 404", async () => {
    const user = await createUser();
    const created = await createExpense(user);

    const borrado = await api
      .delete(`/expenses/${created.body.id}`)
      .set(auth(user));
    const lista = await api.get("/expenses").set(auth(user));
    const otraVez = await api
      .delete(`/expenses/${created.body.id}`)
      .set(auth(user));

    expect(borrado.status).toBe(200);
    expect(lista.body).toEqual([]);
    expect(otraVez.status).toBe(404);
  });
});

describe("ingresos", () => {
  it("crea el ingreso, con el monto como número y la fecha como AAAA-MM-DD", async () => {
    const user = await createUser();

    const res = await createIncome(user, {
      amount: 50000.25,
      description: "sueldo",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amount: 50000.25,
      description: "sueldo",
      source: "web",
    });
    expect(res.body.income_date).toMatch(DATE_ONLY);
  });

  it.each([
    ["monto en cero", { amount: 0 }],
    ["monto negativo", { amount: -5 }],
    ["monto como texto", { amount: "1000" }],
    ["monto por encima del máximo", { amount: 10_000_000_000 }],
    ["origen desconocido", { source: "api" }],
  ])("rechaza datos inválidos: %s", async (_caso, overrides) => {
    const user = await createUser();

    const res = await createIncome(user, overrides);

    expect(res.status).toBe(400);
  });

  it("con ?month= devuelve solo ese mes, incluidos los bordes", async () => {
    const user = await createUser();
    await insertIncome(user, 1, "2026-08-31");
    await insertIncome(user, 2, "2026-09-01");
    await insertIncome(user, 3, "2026-09-30");
    await insertIncome(user, 4, "2026-10-01");

    const res = await api.get("/incomes?month=2026-09").set(auth(user));

    expect(res.status).toBe(200);
    expect(res.body.map((i: { amount: number }) => i.amount)).toEqual([3, 2]);
  });

  it.each(INVALID_MONTHS)(
    "rechaza el mes inválido %j con 400",
    async (month) => {
      const user = await createUser();

      const res = await api.get(`/incomes?month=${month}`).set(auth(user));

      expect(res.status).toBe(400);
    },
  );

  it("actualiza el monto y la descripción", async () => {
    const user = await createUser();
    const created = await createIncome(user, { description: "original" });

    const res = await api
      .patch(`/incomes/${created.body.id}`)
      .set(auth(user))
      .send({ amount: 2000.5, description: null });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ amount: 2000.5, description: null });
  });

  it("rechaza un PATCH sin campos o con un monto inválido", async () => {
    const user = await createUser();
    const created = await createIncome(user);

    const sinCampos = await api
      .patch(`/incomes/${created.body.id}`)
      .set(auth(user))
      .send({});
    const montoInvalido = await api
      .patch(`/incomes/${created.body.id}`)
      .set(auth(user))
      .send({ amount: 0 });

    expect(sinCampos.status).toBe(400);
    expect(montoInvalido.status).toBe(400);
  });

  it("borra el ingreso; repetirlo da 404", async () => {
    const user = await createUser();
    const created = await createIncome(user);

    const borrado = await api
      .delete(`/incomes/${created.body.id}`)
      .set(auth(user));
    const otraVez = await api
      .delete(`/incomes/${created.body.id}`)
      .set(auth(user));

    expect(borrado.status).toBe(200);
    expect(otraVez.status).toBe(404);
  });
});
