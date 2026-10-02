import jwt from "jsonwebtoken";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../db/pool.js";
import { api, closePool, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
afterAll(closePool);

describe("encabezados y errores de la API", () => {
  it("no revela el framework y manda encabezados de seguridad", async () => {
    const res = await api.get("/health");

    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
    expect(res.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("una ruta inexistente responde JSON, no la página de error de Express", async () => {
    const res = await api.get("/ruta-que-no-existe");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body).toEqual({ error: "No encontrado" });
  });

  it("un JSON inválido responde 400 sin traza ni rutas internas", async () => {
    const res = await api
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send("{malformado");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "El cuerpo del pedido no es un JSON válido",
    });
    expect(res.text).not.toMatch(/\bat\b.*(\.js|\.ts)/);
    expect(res.text).not.toContain("/app/");
  });

  it("un cuerpo demasiado grande responde 413 en JSON", async () => {
    const res = await api
      .post("/auth/login")
      .send({ email: "a@example.com", password: "x".repeat(150_000) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "El pedido es demasiado grande" });
  });
});

describe("si la base no responde", () => {
  it("restablecer la contraseña responde 500 en vez de colgarse", async () => {
    vi.spyOn(pool, "connect").mockRejectedValueOnce(
      new Error("caída simulada") as never,
    );

    const res = await api
      .post("/auth/reset-password")
      .send({ token: "x".repeat(30), password: "clave-nueva-456" });

    expect(res.status).toBe(500);
  });

  it("vincular Telegram responde 500 en vez de colgarse", async () => {
    vi.spyOn(pool, "connect").mockRejectedValueOnce(
      new Error("caída simulada") as never,
    );

    const res = await api
      .post("/auth/link-telegram")
      .set("x-internal-key", process.env.INTERNAL_API_KEY!)
      .send({ code: "123456", chatId: "42" });

    expect(res.status).toBe(500);
  });
});

describe("esquema de la base", () => {
  it("todas las tablas tienen RLS activo (la Data API de Supabase no puede leerlas)", async () => {
    const res = await pool.query(
      `SELECT c.relname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
       ORDER BY c.relname`,
    );

    expect(res.rows).toEqual([]);
  });
});

describe("sesión (JWT)", () => {
  it("solo acepta HS256: un token HS512 con el secreto correcto se rechaza", async () => {
    const user = await createUser();
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      algorithm: "HS512",
    });

    const res = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(401);
  });
});

describe("contraseñas", () => {
  async function register(password: string) {
    return api
      .post("/auth/register")
      .send({ email: `usuario-${Math.random()}@example.com`, password });
  }

  it.each([
    ["muy corta", "abc123"],
    ["de más de 72 bytes", "ñ".repeat(37)],
    ["con un solo carácter repetido", "aaaaaaaaaa"],
    ["una de las más comunes", "12345678"],
    ["una común con tildes y mayúsculas", "Contraseña1"],
  ])("rechaza una contraseña %s", async (_caso, password) => {
    const res = await register(password);

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("acepta una contraseña de 72 bytes", async () => {
    const res = await register("clave-segura-".padEnd(72, "9"));

    expect(res.status).toBe(201);
  });
});
