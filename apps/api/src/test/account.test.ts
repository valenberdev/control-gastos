import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { APP_TIMEZONE } from "../config/timezone.js";
import { pool } from "../db/pool.js";
import {
  api,
  auth,
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

const PASSWORD = "clave-segura-123";
const TABLES_WITH_USER_DATA = [
  "expenses",
  "incomes",
  "recurring_expenses",
  "push_subscriptions",
  "telegram_links",
  "link_codes",
  "password_resets",
];

function deleteAccount(user: TestUser, password: unknown = PASSWORD) {
  return api.delete("/auth/me").set(auth(user)).send({ password });
}

async function countRows(table: string, userId: string): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int AS total FROM ${table} WHERE user_id = $1`,
    [userId],
  );
  return res.rows[0].total;
}

async function fillAllTables(user: TestUser, suffix: string) {
  const hoy = today(APP_TIMEZONE);
  await insertExpense(user, 100, hoy);
  await insertIncome(user, 500, hoy);
  await pool.query(
    `INSERT INTO recurring_expenses (user_id, amount, category_id, frequency, next_run_date)
     VALUES ($1, 10, (SELECT id FROM categories WHERE name = 'comida'), 'monthly', now()::date)`,
    [user.id],
  );
  await pool.query(
    "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, 'clave', 'auth')",
    [user.id, `https://push.example.invalid/${suffix}`],
  );
  await pool.query(
    "INSERT INTO telegram_links (chat_id, user_id) VALUES ($1, $2)",
    [`chat-${suffix}`, user.id],
  );
  await pool.query(
    "INSERT INTO link_codes (code, user_id, expires_at) VALUES ($1, $2, now() + interval '5 minutes')",
    [suffix === "a" ? "111111" : "222222", user.id],
  );
  await pool.query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
    [user.id, `hash-${suffix}`],
  );
}

describe("DELETE /auth/me", () => {
  it("exige iniciar sesión", async () => {
    const res = await api.delete("/auth/me").send({ password: PASSWORD });

    expect(res.status).toBe(401);
  });

  it.each([
    [{}],
    [{ password: "" }],
    [{ password: 12345678 }],
    [{ password: null }],
  ])("rechaza el cuerpo inválido %j", async (body) => {
    const user = await createUser();

    const res = await api.delete("/auth/me").set(auth(user)).send(body);

    expect(res.status).toBe(400);
  });

  it("con una contraseña incorrecta responde 403 y la cuenta sigue ahí", async () => {
    const user = await createUser({ password: PASSWORD });

    const res = await deleteAccount(user, "otra-clave-999");
    const sigueExistiendo = await api.get("/auth/me").set(auth(user));

    expect(res.status).toBe(403);
    expect(sigueExistiendo.status).toBe(200);
  });

  it("elimina la cuenta y todo lo que depende de ella, sin tocar a los demás", async () => {
    const ana = await createUser();
    const beto = await createUser();
    await fillAllTables(ana, "a");
    await fillAllTables(beto, "b");

    const res = await deleteAccount(ana);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const usuarios = await pool.query("SELECT id FROM users");
    expect(usuarios.rows.map((row) => row.id)).toEqual([beto.id]);
    for (const table of TABLES_WITH_USER_DATA) {
      expect(
        await countRows(table, ana.id),
        `${table} de la cuenta eliminada`,
      ).toBe(0);
      expect(
        await countRows(table, beto.id),
        `${table} de la otra cuenta`,
      ).toBe(1);
    }
  });

  it("el token de la cuenta eliminada deja de valer de inmediato", async () => {
    const user = await createUser();
    const antes = await api.get("/auth/me").set(auth(user));

    await deleteAccount(user);
    const me = await api.get("/auth/me").set(auth(user));
    const gastos = await api.get("/expenses").set(auth(user));

    expect(antes.status).toBe(200);
    expect(me.status).toBe(401);
    expect(gastos.status).toBe(401);
  });

  it("no se puede iniciar sesión con la cuenta eliminada, pero el email se puede volver a registrar", async () => {
    const user = await createUser({
      email: "ana@example.com",
      password: PASSWORD,
    });

    await deleteAccount(user);
    const login = await api
      .post("/auth/login")
      .send({ email: "ana@example.com", password: PASSWORD });
    const registro = await api
      .post("/auth/register")
      .send({ email: "ana@example.com", password: PASSWORD });

    expect(login.status).toBe(401);
    expect(registro.status).toBe(201);
    expect(registro.body.user.id).not.toBe(user.id);
  });
});

describe("sesiones y cuentas inexistentes", () => {
  it("un token bien firmado de una cuenta que nunca existió da 401", async () => {
    const token = jwt.sign({ userId: randomUUID() }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    const res = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(401);
  });

  it("un token bien firmado con un userId que no es un UUID da 401, no un error de servidor", async () => {
    const token = jwt.sign(
      { userId: "no-es-un-uuid" },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    const res = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(401);
  });
});
