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
