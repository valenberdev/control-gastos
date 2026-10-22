import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { api, closePool } from "./helpers.js";

afterAll(closePool);
afterEach(() => vi.unstubAllEnvs());

describe("GET /docs", () => {
  it("sirve Swagger UI sin pedir sesión", async () => {
    const res = await api.get("/docs");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("/docs/swagger-ui-bundle.js");

    const bundle = await api.get("/docs/swagger-ui-bundle.js");
    expect(bundle.status).toBe(200);
  });

  it("sirve la especificación OpenAPI con el esquema Bearer", async () => {
    const res = await api.get("/docs/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths["/expenses"]).toBeDefined();
    expect(res.body.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  it("no expone otros archivos del paquete de Swagger UI", async () => {
    const res = await api.get("/docs/package.json");

    expect(res.status).toBe(404);
  });

  it("relaja la política de seguridad solo en /docs", async () => {
    const docs = await api.get("/docs");
    const health = await api.get("/health");

    expect(docs.headers["content-security-policy"]).toContain(
      "connect-src 'self'",
    );
    expect(health.headers["content-security-policy"]).not.toContain(
      "connect-src",
    );
    expect(health.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
  });

  it("habilita \"Try it out\" fuera de producción", async () => {
    const res = await api.get("/docs/init.js");

    expect(res.text).toContain('"post"');
  });

  it("en producción queda solo de lectura, sin \"Try it out\" ni Authorize", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const init = await api.get("/docs/init.js");
    const page = await api.get("/docs");

    expect(init.text).toContain("supportedSubmitMethods: []");
    expect(page.text).toContain(".auth-wrapper");
  });
});
