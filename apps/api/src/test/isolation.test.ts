import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../db/pool.js";
import {
  api,
  auth,
  categoryId,
  closePool,
  createUser,
  resetDb,
  type TestUser,
} from "./helpers.js";

beforeEach(resetDb);
afterAll(closePool);

async function addExpense(user: TestUser, amount: number) {
  const res = await api
    .post("/expenses")
    .set(auth(user))
    .send({
      amount,
      categoryId: await categoryId(),
      source: "web",
      description: "prueba",
    });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

async function addIncome(user: TestUser, amount: number) {
  const res = await api
    .post("/incomes")
    .set(auth(user))
    .send({ amount, source: "web", description: "prueba" });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

describe("lecturas", () => {
  it("cada usuario ve solo sus gastos e ingresos", async () => {
    const ana = await createUser();
    const beto = await createUser();
    await addExpense(ana, 100);
    await addIncome(ana, 5000);

    const gastosDeBeto = await api.get("/expenses").set(auth(beto));
    const ingresosDeBeto = await api.get("/incomes").set(auth(beto));
    const gastosDeAna = await api.get("/expenses").set(auth(ana));

    expect(gastosDeBeto.body).toEqual([]);
    expect(ingresosDeBeto.body).toEqual([]);
    expect(gastosDeAna.body).toHaveLength(1);
  });

  it("el saldo de cada usuario cuenta solo lo suyo", async () => {
    const ana = await createUser();
    const beto = await createUser();
    await addIncome(ana, 5000);
    await addExpense(ana, 300);
    await addIncome(beto, 50);

    const saldoDeAna = await api.get("/balance").set(auth(ana));
    const saldoDeBeto = await api.get("/balance").set(auth(beto));

    expect(saldoDeAna.body).toEqual({
      balance: 4700,
      totalIncome: 5000,
      totalExpenses: 300,
    });
    expect(saldoDeBeto.body).toEqual({
      balance: 50,
      totalIncome: 50,
      totalExpenses: 0,
    });
  });
});

describe("escrituras", () => {
  it("un usuario no puede editar el gasto de otro", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const gasto = await addExpense(ana, 100);

    const res = await api
      .patch(`/expenses/${gasto.id}`)
      .set(auth(beto))
      .send({ amount: 1 });
    const enBase = await pool.query(
      "SELECT amount FROM expenses WHERE id = $1",
      [gasto.id],
    );

    expect(res.status).toBe(404);
    expect(Number(enBase.rows[0].amount)).toBe(100);
  });

  it("un usuario no puede borrar el gasto de otro", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const gasto = await addExpense(ana, 100);

    const res = await api.delete(`/expenses/${gasto.id}`).set(auth(beto));
    const enBase = await pool.query(
      "SELECT count(*)::int AS total FROM expenses WHERE id = $1",
      [gasto.id],
    );

    expect(res.status).toBe(404);
    expect(enBase.rows[0].total).toBe(1);
  });

  it("un usuario no puede editar el ingreso de otro", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const ingreso = await addIncome(ana, 5000);

    const res = await api
      .patch(`/incomes/${ingreso.id}`)
      .set(auth(beto))
      .send({ amount: 1 });
    const enBase = await pool.query(
      "SELECT amount FROM incomes WHERE id = $1",
      [ingreso.id],
    );

    expect(res.status).toBe(404);
    expect(Number(enBase.rows[0].amount)).toBe(5000);
  });

  it("un usuario no puede borrar el ingreso de otro", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const ingreso = await addIncome(ana, 5000);

    const res = await api.delete(`/incomes/${ingreso.id}`).set(auth(beto));
    const enBase = await pool.query(
      "SELECT count(*)::int AS total FROM incomes WHERE id = $1",
      [ingreso.id],
    );

    expect(res.status).toBe(404);
    expect(enBase.rows[0].total).toBe(1);
  });

  it("el dueño de un gasto sale del token: un userId en el cuerpo se ignora", async () => {
    const ana = await createUser();
    const beto = await createUser();

    const res = await api
      .post("/expenses")
      .set(auth(ana))
      .send({
        amount: 100,
        categoryId: await categoryId(),
        source: "web",
        userId: beto.id,
      });
    const enBase = await pool.query(
      "SELECT user_id FROM expenses WHERE id = $1",
      [res.body.id],
    );

    expect(res.status).toBe(201);
    expect(enBase.rows[0].user_id).toBe(ana.id);
  });

  it("un id que no es un UUID responde 404", async () => {
    const ana = await createUser();

    const editar = await api
      .patch("/expenses/123")
      .set(auth(ana))
      .send({ amount: 1 });
    const borrar = await api.delete("/incomes/no-es-un-uuid").set(auth(ana));

    expect(editar.status).toBe(404);
    expect(borrar.status).toBe(404);
  });
});

describe("suscripciones push", () => {
  it("un usuario no puede borrar la suscripción de otro", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/suscripcion-de-ana",
      keys: { p256dh: "B" + "A".repeat(86), auth: "A".repeat(22) },
    };
    const alta = await api
      .post("/push/subscribe")
      .set(auth(ana))
      .send(subscription);
    expect(alta.status).toBe(201);

    await api
      .delete("/push/subscribe")
      .set(auth(beto))
      .send({ endpoint: subscription.endpoint });
    const trasElIntentoDeBeto = await pool.query(
      "SELECT count(*)::int AS total FROM push_subscriptions",
    );

    await api
      .delete("/push/subscribe")
      .set(auth(ana))
      .send({ endpoint: subscription.endpoint });
    const trasLaBajaDeAna = await pool.query(
      "SELECT count(*)::int AS total FROM push_subscriptions",
    );

    expect(trasElIntentoDeBeto.rows[0].total).toBe(1);
    expect(trasLaBajaDeAna.rows[0].total).toBe(0);
  });
});
