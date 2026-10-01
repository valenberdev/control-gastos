import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { APP_TIMEZONE } from "../config/timezone.js";
import { api, auth, closePool, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterAll(closePool);

describe("POST /auth/register", () => {
  it("crea la cuenta y devuelve un token", async () => {
    const res = await api
      .post("/auth/register")
      .send({ email: "ana@example.com", password: "clave-segura-123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: "ana@example.com",
      timezone: APP_TIMEZONE,
    });
  });

  it("guarda el email en minúsculas y sin espacios", async () => {
    const res = await api
      .post("/auth/register")
      .send({ email: "  Ana@Example.COM ", password: "clave-segura-123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ana@example.com");
  });

  it("rechaza un email repetido aunque cambien las mayúsculas", async () => {
    await createUser({ email: "ana@example.com" });

    const res = await api
      .post("/auth/register")
      .send({ email: "ANA@example.com", password: "clave-segura-123" });

    expect(res.status).toBe(409);
  });

  it.each([
    [
      "email inválido",
      { email: "no-es-un-email", password: "clave-segura-123" },
    ],
    ["sin email", { password: "clave-segura-123" }],
    [
      "contraseña de 7 caracteres",
      { email: "ana@example.com", password: "1234567" },
    ],
    ["sin contraseña", { email: "ana@example.com" }],
    [
      "contraseña que no es texto",
      { email: "ana@example.com", password: 12345678 },
    ],
  ])("rechaza datos inválidos: %s", async (_caso, body) => {
    const res = await api.post("/auth/register").send(body);

    expect(res.status).toBe(400);
  });

  it("guarda la zona horaria del dispositivo si es válida", async () => {
    const user = await createUser({ timezone: "Europe/Madrid" });

    const res = await api.get("/auth/me").set(auth(user));

    expect(res.body.timezone).toBe("Europe/Madrid");
  });

  it("usa la zona por defecto si la que llega no existe", async () => {
    const user = await createUser({ timezone: "Foo/Bar" });

    const res = await api.get("/auth/me").set(auth(user));

    expect(res.body.timezone).toBe(APP_TIMEZONE);
  });
});

describe("POST /auth/login", () => {
  it("entra con las credenciales correctas", async () => {
    await createUser({
      email: "ana@example.com",
      password: "clave-segura-123",
    });

    const res = await api
      .post("/auth/login")
      .send({ email: "ana@example.com", password: "clave-segura-123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe("ana@example.com");
  });

  it("ignora mayúsculas y espacios en el email", async () => {
    await createUser({
      email: "ana@example.com",
      password: "clave-segura-123",
    });

    const res = await api
      .post("/auth/login")
      .send({ email: "  ANA@Example.com ", password: "clave-segura-123" });

    expect(res.status).toBe(200);
  });

  it("responde igual con una contraseña incorrecta que con un email inexistente", async () => {
    await createUser({
      email: "ana@example.com",
      password: "clave-segura-123",
    });

    const wrongPassword = await api
      .post("/auth/login")
      .send({ email: "ana@example.com", password: "otra-clave-999" });
    const unknownEmail = await api
      .post("/auth/login")
      .send({ email: "nadie@example.com", password: "otra-clave-999" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("rechaza pedidos sin datos", async () => {
    const res = await api.post("/auth/login").send({});

    expect(res.status).toBe(400);
  });
});

describe("sesión", () => {
  it.each([
    "/auth/me",
    "/categories",
    "/expenses",
    "/incomes",
    "/balance",
    "/reports/trend",
  ])("GET %s exige iniciar sesión", async (path) => {
    const res = await api.get(path);

    expect(res.status).toBe(401);
  });

  it("rechaza un token inventado", async () => {
    const res = await api
      .get("/auth/me")
      .set({ Authorization: "Bearer abc.def.ghi" });

    expect(res.status).toBe(401);
  });

  it("rechaza un token vencido", async () => {
    const user = await createUser();
    const expired = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: -10,
    });

    const res = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${expired}` });

    expect(res.status).toBe(401);
  });

  it("rechaza un token firmado con otro secreto", async () => {
    const user = await createUser();
    const forged = jwt.sign({ userId: user.id }, "otro-secreto", {
      expiresIn: "1h",
    });

    const res = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${forged}` });

    expect(res.status).toBe(401);
  });

  it("acepta el token de la cuenta y devuelve sus datos", async () => {
    const user = await createUser({ email: "ana@example.com" });

    const res = await api.get("/auth/me").set(auth(user));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: "ana@example.com" });
  });
});

describe("PATCH /auth/timezone", () => {
  it("cambia la zona horaria", async () => {
    const user = await createUser();

    const res = await api
      .patch("/auth/timezone")
      .set(auth(user))
      .send({ timezone: "Pacific/Auckland" });
    const me = await api.get("/auth/me").set(auth(user));

    expect(res.status).toBe(200);
    expect(me.body.timezone).toBe("Pacific/Auckland");
  });

  it("rechaza una zona inexistente y conserva la anterior", async () => {
    const user = await createUser({ timezone: "Europe/Madrid" });

    const res = await api
      .patch("/auth/timezone")
      .set(auth(user))
      .send({ timezone: "Foo/Bar" });
    const me = await api.get("/auth/me").set(auth(user));

    expect(res.status).toBe(400);
    expect(me.body.timezone).toBe("Europe/Madrid");
  });

  it("exige iniciar sesión", async () => {
    const res = await api
      .patch("/auth/timezone")
      .send({ timezone: "Europe/Madrid" });

    expect(res.status).toBe(401);
  });
});
