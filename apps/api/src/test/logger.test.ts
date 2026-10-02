import { describe, expect, it } from "vitest";
import { describeError } from "../lib/logger.js";

describe("describeError", () => {
  it("no incluye el detalle de un error de Postgres (puede traer el email)", () => {
    const err = Object.assign(
      new Error('duplicate key value violates unique constraint "users_email_key"'),
      {
        code: "23505",
        constraint: "users_email_key",
        detail: "Key (email)=(ana@example.com) already exists.",
      },
    );

    const texto = describeError(err);

    expect(texto).toContain("23505");
    expect(texto).toContain("users_email_key");
    expect(texto).not.toContain("ana@example.com");
  });

  it("no incluye el endpoint de una suscripción push (funciona como credencial)", () => {
    const err = Object.assign(new Error("Received unexpected response code"), {
      statusCode: 500,
      endpoint: "https://fcm.googleapis.com/fcm/send/secreto-de-entrega",
      body: "respuesta del servicio",
    });

    const texto = describeError(err);

    expect(texto).toContain("status=500");
    expect(texto).not.toContain("secreto-de-entrega");
  });

  it("acepta valores que no son errores", () => {
    expect(describeError("algo")).toBe("algo");
    expect(describeError(null)).toBe("null");
  });
});
