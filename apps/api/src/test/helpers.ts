import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";

export const api = request(app);

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

let counter = 0;

export async function createUser(
  options: { email?: string; password?: string; timezone?: string } = {},
): Promise<TestUser> {
  counter += 1;
  const res = await api.post("/auth/register").send({
    email: options.email ?? `usuario${counter}@example.com`,
    password: options.password ?? "clave-segura-123",
    timezone: options.timezone,
  });
  if (res.status !== 201) {
    throw new Error(
      `No se pudo crear el usuario de prueba: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return {
    id: res.body.user.id,
    email: res.body.user.email,
    token: res.body.token,
  };
}

export function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

export async function categoryId(name = "comida"): Promise<string> {
  const res = await pool.query("SELECT id FROM categories WHERE name = $1", [
    name,
  ]);
  return res.rows[0].id;
}

export async function resetDb() {
  await pool.query("TRUNCATE users CASCADE");
}

export async function closePool() {
  await pool.end();
}

export async function insertExpense(
  user: TestUser,
  amount: number,
  date: string,
  category = "comida",
) {
  await pool.query(
    `INSERT INTO expenses (user_id, amount, category_id, source, expense_date)
     VALUES ($1, $2, (SELECT id FROM categories WHERE name = $3), 'web', $4::date)`,
    [user.id, amount, category, date],
  );
}

export async function insertIncome(
  user: TestUser,
  amount: number,
  date: string,
) {
  await pool.query(
    `INSERT INTO incomes (user_id, amount, source, income_date) VALUES ($1, $2, 'web', $3::date)`,
    [user.id, amount, date],
  );
}

export function today(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function firstOfMonth(date: string): string {
  return `${date.slice(0, 8)}01`;
}
