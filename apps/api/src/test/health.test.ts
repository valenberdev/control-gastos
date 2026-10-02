import { afterAll, describe, expect, it, vi } from "vitest";
import { pool } from "../db/pool.js";
import { api, closePool } from "./helpers.js";

afterAll(closePool);

describe("GET /health", () => {
  it("responde ok sin tocar la base", async () => {
    const spy = vi.spyOn(pool, "query");

    const res = await api.get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("GET /health/db", () => {
  it("consulta la base y responde ok, sin pedir sesión", async () => {
    const res = await api.get("/health/db");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "ok" });
  });

  it("responde 503 sin revelar el error si la base falla", async () => {
    const spy = vi
      .spyOn(pool, "query")
      .mockRejectedValueOnce(new Error("detalle interno secreto"));

    const res = await api.get("/health/db");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "error", db: "error" });
    expect(JSON.stringify(res.body)).not.toContain("secreto");
    spy.mockRestore();
  });
});
