import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { recordConnect, recordQuery, serverTiming } from "../lib/serverTiming.js";

describe("Server-Timing (opcional)", () => {
  const app = express();
  app.use(serverTiming("https://app.example.com"));
  app.get("/x", async (_req, res) => {
    recordConnect();
    recordQuery(12);
    recordQuery(8);
    res.json({ ok: true });
  });

  it("informa tiempo de base, cantidad de consultas y conexiones nuevas", async () => {
    const res = await request(app).get("/x");

    expect(res.status).toBe(200);
    expect(res.headers["server-timing"]).toMatch(/db;dur=20\.0;desc="consultas=2"/);
    expect(res.headers["server-timing"]).toMatch(/conn;desc="nuevas=1"/);
    expect(res.headers["server-timing"]).toMatch(/total;dur=\d/);
    expect(res.headers["timing-allow-origin"]).toBe("https://app.example.com");
  });

  it("recordQuery fuera de un pedido no falla", () => {
    expect(() => recordQuery(5)).not.toThrow();
  });
});
