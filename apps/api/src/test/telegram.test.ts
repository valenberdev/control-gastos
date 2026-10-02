import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../db/pool.js";
import {
  api,
  auth,
  closePool,
  createUser,
  resetDb,
  type TestUser,
} from "./helpers.js";

beforeEach(resetDb);
afterAll(closePool);

const internal = { "x-internal-key": process.env.INTERNAL_API_KEY! };

async function generateCode(user: TestUser): Promise<string> {
  const res = await api.post("/auth/link-code").set(auth(user));
  expect(res.status).toBe(201);
  return res.body.code;
}

function link(
  code: unknown,
  chatId: unknown,
  headers: Record<string, string> = internal,
) {
  return api.post("/auth/link-telegram").set(headers).send({ code, chatId });
}

function telegramToken(
  chatId: unknown,
  headers: Record<string, string> = internal,
) {
  return api.post("/auth/telegram-token").set(headers).send({ chatId });
}

async function links() {
  const res = await pool.query(
    "SELECT chat_id, user_id FROM telegram_links ORDER BY chat_id",
  );
  return res.rows as { chat_id: string; user_id: string }[];
}

describe("POST /auth/link-code", () => {
  it("exige iniciar sesión", async () => {
    const res = await api.post("/auth/link-code");

    expect(res.status).toBe(401);
  });

  it("devuelve un código de 6 dígitos que vence en 10 minutos y queda guardado", async () => {
    const user = await createUser();

    const res = await api.post("/auth/link-code").set(auth(user));
    const msLeft = new Date(res.body.expiresAt).getTime() - Date.now();
    const stored = await pool.query(
      "SELECT user_id FROM link_codes WHERE code = $1",
      [res.body.code],
    );

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^\d{6}$/);
    expect(msLeft).toBeGreaterThan(9 * 60_000);
    expect(msLeft).toBeLessThanOrEqual(10 * 60_000);
    expect(stored.rows[0].user_id).toBe(user.id);
  });

  it("un código nuevo invalida el anterior de la misma cuenta", async () => {
    const user = await createUser();
    const viejo = await generateCode(user);
    const nuevo = await generateCode(user);

    const conElViejo = await link(viejo, "111");
    const conElNuevo = await link(nuevo, "111");

    expect(conElViejo.status).toBe(404);
    expect(conElNuevo.status).toBe(200);
  });

  it("cada cuenta conserva su propio código vigente", async () => {
    const ana = await createUser();
    const beto = await createUser();
    const codigoDeAna = await generateCode(ana);
    const codigoDeBeto = await generateCode(beto);

    const vinculaAna = await link(codigoDeAna, "111");
    const vinculaBeto = await link(codigoDeBeto, "222");

    expect(vinculaAna.status).toBe(200);
    expect(vinculaBeto.status).toBe(200);
  });

  it("al generar uno, borra los códigos vencidos de cualquier cuenta", async () => {
    const ana = await createUser();
    const beto = await createUser();
    await pool.query(
      "INSERT INTO link_codes (code, user_id, expires_at) VALUES ('111111', $1, now() - interval '1 hour')",
      [beto.id],
    );

    await generateCode(ana);
    const deBeto = await pool.query(
      "SELECT count(*)::int AS total FROM link_codes WHERE user_id = $1",
      [beto.id],
    );

    expect(deBeto.rows[0].total).toBe(0);
  });
});

describe("POST /auth/link-telegram", () => {
  it("vincula el chat con la cuenta que generó el código y gasta el código", async () => {
    const user = await createUser();
    const code = await generateCode(user);

    const res = await link(code, "123456789");
    const restantes = await pool.query(
      "SELECT count(*)::int AS total FROM link_codes WHERE code = $1",
      [code],
    );

    expect(res.status).toBe(200);
    expect(await links()).toEqual([{ chat_id: "123456789", user_id: user.id }]);
    expect(restantes.rows[0].total).toBe(0);
  });

  it("el código sirve una sola vez", async () => {
    const user = await createUser();
    const code = await generateCode(user);

    const primera = await link(code, "111");
    const segunda = await link(code, "222");

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(404);
    expect(await links()).toHaveLength(1);
  });

  it("un código vencido se rechaza", async () => {
    const user = await createUser();
    const code = await generateCode(user);
    await pool.query(
      "UPDATE link_codes SET expires_at = now() - interval '1 minute'",
    );

    const res = await link(code, "111");

    expect(res.status).toBe(404);
    expect(await links()).toEqual([]);
  });

  it("un código que no existe se rechaza", async () => {
    const res = await link("000000", "111");

    expect(res.status).toBe(404);
  });

  it.each([
    ["código de 5 dígitos", "12345", "1"],
    ["código de 7 dígitos", "1234567", "1"],
    ["código con letras", "abc123", "1"],
    ["código que no es texto", 123456, "1"],
    ["sin código", undefined, "1"],
    ["chat vacío", "123456", ""],
    ["chat con letras", "123456", "abc"],
    ["chat que no es texto", "123456", 123],
    ["sin chat", "123456", undefined],
  ])("rechaza datos inválidos: %s", async (_caso, code, chatId) => {
    const res = await link(code, chatId);

    expect(res.status).toBe(400);
  });

  it("exige la clave interna", async () => {
    const sinClave = await link("123456", "1", {});
    const claveIncorrecta = await link("123456", "1", {
      "x-internal-key": "otra-clave",
    });

    expect(sinClave.status).toBe(401);
    expect(claveIncorrecta.status).toBe(401);
  });

  it("si el servidor no tiene clave interna configurada, nadie entra", async () => {
    const original = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = "";
    try {
      const res = await link("123456", "1", { "x-internal-key": "cualquiera" });

      expect(res.status).toBe(401);
    } finally {
      process.env.INTERNAL_API_KEY = original;
    }
  });

  it("vincular un chat que ya estaba vinculado lo pasa a la cuenta nueva", async () => {
    const ana = await createUser();
    const beto = await createUser();
    await link(await generateCode(ana), "777");

    const res = await link(await generateCode(beto), "777");

    expect(res.status).toBe(200);
    expect(await links()).toEqual([{ chat_id: "777", user_id: beto.id }]);
  });

  it("una cuenta puede tener varios chats vinculados", async () => {
    const user = await createUser();
    await link(await generateCode(user), "111");
    await link(await generateCode(user), "222");

    expect(await links()).toEqual([
      { chat_id: "111", user_id: user.id },
      { chat_id: "222", user_id: user.id },
    ]);
  });

  it("un código vincula un solo chat aunque lleguen dos pedidos a la vez", async () => {
    const user = await createUser();
    const code = await generateCode(user);

    const [a, b] = await Promise.all([link(code, "111"), link(code, "222")]);

    expect([a.status, b.status].sort()).toEqual([200, 404]);
    expect(await links()).toHaveLength(1);
  });
});

describe("POST /auth/telegram-token", () => {
  it("un chat vinculado recibe el token de su cuenta", async () => {
    const user = await createUser({ email: "ana@example.com" });
    await link(await generateCode(user), "123456789");

    const res = await telegramToken("123456789");
    const me = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${res.body.token}` });

    expect(res.status).toBe(200);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("ana@example.com");
  });

  it("cada chat recibe el token de su propia cuenta", async () => {
    const ana = await createUser({ email: "ana@example.com" });
    const beto = await createUser({ email: "beto@example.com" });
    await link(await generateCode(ana), "111");
    await link(await generateCode(beto), "222");

    const deAna = await telegramToken("111");
    const deBeto = await telegramToken("222");
    const meDeAna = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${deAna.body.token}` });
    const meDeBeto = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${deBeto.body.token}` });

    expect(meDeAna.body.email).toBe("ana@example.com");
    expect(meDeBeto.body.email).toBe("beto@example.com");
  });

  it("un chat sin vincular da 404", async () => {
    const res = await telegramToken("999");

    expect(res.status).toBe(404);
  });

  it.each([[""], ["abc"], [123], [undefined]])(
    "rechaza el chat inválido %j",
    async (chatId) => {
      const res = await telegramToken(chatId);

      expect(res.status).toBe(400);
    },
  );

  it("exige la clave interna", async () => {
    const user = await createUser();
    await link(await generateCode(user), "111");

    const sinClave = await telegramToken("111", {});
    const claveIncorrecta = await telegramToken("111", {
      "x-internal-key": "otra-clave",
    });

    expect(sinClave.status).toBe(401);
    expect(claveIncorrecta.status).toBe(401);
  });
});

describe("token del bot", () => {
  it("es corto (15 minutos), lleva el chat y la versión de sesión", async () => {
    const user = await createUser({ email: "ana@example.com" });
    await link(await generateCode(user), "123456789");

    const res = await telegramToken("123456789");
    const claims = jwt.decode(res.body.token) as Record<string, number | string>;

    expect(claims.via).toBe("telegram");
    expect(claims.chat).toBe("123456789");
    expect(claims.v).toBe(0);
    expect(Number(claims.exp) - Number(claims.iat)).toBe(15 * 60);
  });
});

describe("GET /auth/telegram", () => {
  it("exige iniciar sesión", async () => {
    expect((await api.get("/auth/telegram")).status).toBe(401);
  });

  it("lista solo los chats de la cuenta", async () => {
    const ana = await createUser({ email: "ana@example.com" });
    const beto = await createUser({ email: "beto@example.com" });
    await link(await generateCode(ana), "111111");
    await link(await generateCode(ana), "222222");
    await link(await generateCode(beto), "333333");

    const res = await api.get("/auth/telegram").set(auth(ana));

    expect(res.status).toBe(200);
    expect(res.body.map((c: { chatId: string }) => c.chatId).sort()).toEqual([
      "111111",
      "222222",
    ]);
  });
});

describe("DELETE /auth/telegram/:chatId", () => {
  it("desvincula el chat y el token que el bot ya tenía deja de valer", async () => {
    const ana = await createUser({ email: "ana@example.com" });
    await link(await generateCode(ana), "111111");
    const bot = { Authorization: `Bearer ${(await telegramToken("111111")).body.token}` };
    const antes = await api.get("/balance").set(bot);

    const res = await api.delete("/auth/telegram/111111").set(auth(ana));
    const despues = await api.get("/balance").set(bot);
    const nuevoToken = await telegramToken("111111");

    expect(antes.status).toBe(200);
    expect(res.status).toBe(200);
    expect(despues.status).toBe(401);
    expect(nuevoToken.status).toBe(404);
    expect(await links()).toEqual([]);
  });

  it("no toca los chats de otra cuenta", async () => {
    const ana = await createUser({ email: "ana@example.com" });
    const beto = await createUser({ email: "beto@example.com" });
    await link(await generateCode(beto), "333333");

    const res = await api.delete("/auth/telegram/333333").set(auth(ana));

    expect(res.status).toBe(404);
    expect(await links()).toEqual([{ chat_id: "333333", user_id: beto.id }]);
  });

  it("un chat con formato inválido da 404", async () => {
    const ana = await createUser({ email: "ana@example.com" });

    const res = await api.delete("/auth/telegram/no-es-un-chat").set(auth(ana));

    expect(res.status).toBe(404);
  });

  it("exige iniciar sesión", async () => {
    expect((await api.delete("/auth/telegram/111111")).status).toBe(401);
  });
});
