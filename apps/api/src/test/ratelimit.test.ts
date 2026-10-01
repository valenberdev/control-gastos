import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { api, auth, closePool, createUser, resetDb } from "./helpers.js";

const freshPools: Array<{ end: () => Promise<void> }> = [];

async function freshApi() {
  vi.resetModules();
  const { app } = await import("../app.js");
  const { pool } = await import("../db/pool.js");
  freshPools.push(pool);
  return request(app);
}

function rateLimitsOn() {
  process.env.RATE_LIMIT_DISABLED = "false";
}

beforeEach(resetDb);
afterEach(async () => {
  process.env.RATE_LIMIT_DISABLED = "true";
  await Promise.all(freshPools.splice(0).map((pool) => pool.end()));
});
afterAll(closePool);

const PASSWORD = "clave-segura-123";
const WRONG = "incorrecta-123";

describe("login", () => {
  it("bloquea tras 5 intentos fallidos de la misma cuenta, aunque después la contraseña sea la correcta", async () => {
    const ana = await createUser({
      email: "ana@example.com",
      password: PASSWORD,
    });
    const beto = await createUser({
      email: "beto@example.com",
      password: PASSWORD,
    });
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/login")
            .send({ email: ana.email, password: WRONG })
        ).status,
      );
    }
    const conClaveCorrecta = await fresh
      .post("/auth/login")
      .send({ email: ana.email, password: PASSWORD });
    const otraCuenta = await fresh
      .post("/auth/login")
      .send({ email: beto.email, password: PASSWORD });

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect(conClaveCorrecta.status).toBe(429);
    expect(otraCuenta.status).toBe(200);
  });

  it("cuenta igual las mayúsculas del email", async () => {
    const ana = await createUser({
      email: "ana@example.com",
      password: PASSWORD,
    });
    const fresh = await freshApi();
    rateLimitsOn();

    for (let i = 0; i < 5; i++) {
      await fresh
        .post("/auth/login")
        .send({ email: ana.email, password: WRONG });
    }
    const conMayusculas = await fresh
      .post("/auth/login")
      .send({ email: "ANA@Example.com", password: WRONG });

    expect(conMayusculas.status).toBe(429);
  });

  it("los ingresos correctos no cuentan", async () => {
    const ana = await createUser({
      email: "ana@example.com",
      password: PASSWORD,
    });
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/login")
            .send({ email: ana.email, password: PASSWORD })
        ).status,
      );
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 200]);
  });

  it("bloquea a una IP tras 30 intentos fallidos, aunque cambie de email", async () => {
    const ana = await createUser({
      email: "ana@example.com",
      password: PASSWORD,
    });
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/login")
            .send({ email: `nadie${i}@example.com`, password: WRONG })
        ).status,
      );
    }
    const conClaveCorrecta = await fresh
      .post("/auth/login")
      .send({ email: ana.email, password: PASSWORD });

    expect(statuses.slice(0, 30).every((status) => status === 401)).toBe(true);
    expect(statuses[30]).toBe(429);
    expect(conClaveCorrecta.status).toBe(429);
  }, 30_000);

  it("el bloqueo responde 429 con un mensaje y Retry-After", async () => {
    const fresh = await freshApi();
    rateLimitsOn();

    let ultimo = await fresh
      .post("/auth/login")
      .send({ email: "nadie@example.com", password: WRONG });
    for (let i = 0; i < 5; i++) {
      ultimo = await fresh
        .post("/auth/login")
        .send({ email: "nadie@example.com", password: WRONG });
    }

    expect(ultimo.status).toBe(429);
    expect(ultimo.body.error).toEqual(expect.any(String));
    expect(Number(ultimo.headers["retry-after"])).toBeGreaterThan(0);
  });
});

describe("registro", () => {
  it("permite 10 registros por hora desde una IP y bloquea el 11", async () => {
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/register")
            .send({ email: `nuevo${i}@example.com`, password: PASSWORD })
        ).status,
      );
    }

    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  }, 30_000);
});

describe("recuperación de contraseña", () => {
  it("permite 3 pedidos por hora para un mismo email y bloquea el 4", async () => {
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/forgot-password")
            .send({ email: "nadie@example.com" })
        ).status,
      );
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("permite 5 pedidos por hora desde una IP, con emails distintos, y bloquea el 6", async () => {
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/forgot-password")
            .send({ email: `nadie${i}@example.com` })
        ).status,
      );
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("bloquea tras 10 intentos fallidos de restablecer", async () => {
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/reset-password")
            .send({ token: `${i}`.padStart(43, "a"), password: PASSWORD })
        ).status,
      );
    }

    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("vínculo de Telegram", () => {
  const internal = { "x-internal-key": process.env.INTERNAL_API_KEY! };

  it("permite 10 códigos por hora por cuenta y bloquea el 11, sin afectar a otra cuenta", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await fresh.post("/auth/link-code").set(auth(ana))).status,
      );
    }
    const otraCuenta = await fresh.post("/auth/link-code").set(auth(beto));

    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(otraCuenta.status).toBe(201);
  });

  it("bloquea a un chat tras 5 códigos incorrectos, aunque el siguiente sea el bueno, sin afectar a otro chat", async () => {
    const ana = await createUser();
    const codigo = (await api.post("/auth/link-code").set(auth(ana))).body
      .code as string;
    const fresh = await freshApi();
    rateLimitsOn();

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await fresh
            .post("/auth/link-telegram")
            .set(internal)
            .send({ code: "000000", chatId: "111" })
        ).status,
      );
    }
    const conElCodigoBueno = await fresh
      .post("/auth/link-telegram")
      .set(internal)
      .send({ code: codigo, chatId: "111" });
    const otroChat = await fresh
      .post("/auth/link-telegram")
      .set(internal)
      .send({ code: codigo, chatId: "222" });

    expect(statuses).toEqual([404, 404, 404, 404, 404, 429]);
    expect(conElCodigoBueno.status).toBe(429);
    expect(otroChat.status).toBe(200);
  });
});
