import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../db/pool.js";
import { sendEmail } from "../services/email.js";
import { api, auth, closePool, createUser, resetDb } from "./helpers.js";

const sendEmailMock = vi.mocked(sendEmail);
const PASSWORD = "clave-segura-123";
const NEW_PASSWORD = "clave-nueva-456";

beforeEach(async () => {
  await resetDb();
  sendEmailMock.mockClear();
});
afterAll(closePool);

function requestReset(email: unknown) {
  return api.post("/auth/forgot-password").send({ email });
}

async function waitForEmails(count: number) {
  await vi.waitFor(() => expect(sendEmailMock).toHaveBeenCalledTimes(count));
}

function tokenFromEmail(callIndex = 0): string {
  const { text } = sendEmailMock.mock.calls[callIndex][0];
  const match = text.match(/restablecer#token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("El mail no trae un link de recuperación.");
  return match[1];
}

function resetPassword(token: string, password: unknown = NEW_PASSWORD) {
  return api.post("/auth/reset-password").send({ token, password });
}

function login(email: string, password: string) {
  return api.post("/auth/login").send({ email, password });
}

async function userWithResetToken(email = "ana@example.com") {
  await createUser({ email, password: PASSWORD });
  await requestReset(email);
  await waitForEmails(1);
  return { email, token: tokenFromEmail() };
}

describe("POST /auth/forgot-password", () => {
  it("manda el mail a la cuenta con un link al frontend", async () => {
    await createUser({ email: "ana@example.com" });

    const res = await requestReset("ana@example.com");
    await waitForEmails(1);

    const message = sendEmailMock.mock.calls[0][0];
    expect(res.status).toBe(200);
    expect(message.to).toBe("ana@example.com");
    expect(message.text).toContain("http://localhost:5173/restablecer#token=");
    expect(tokenFromEmail()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("ignora mayúsculas y espacios en el email", async () => {
    await createUser({ email: "ana@example.com" });

    await requestReset("  ANA@Example.COM ");
    await waitForEmails(1);

    expect(sendEmailMock.mock.calls[0][0].to).toBe("ana@example.com");
  });

  it("responde exactamente igual si la cuenta no existe, y no manda nada", async () => {
    await createUser({ email: "ana@example.com" });

    const existente = await requestReset("ana@example.com");
    await waitForEmails(1);
    const inexistente = await requestReset("nadie@example.com");
    await requestReset("ana@example.com");
    await waitForEmails(2);

    expect(inexistente.status).toBe(existente.status);
    expect(inexistente.body).toEqual(existente.body);
    expect(sendEmailMock.mock.calls.map(([message]) => message.to)).toEqual([
      "ana@example.com",
      "ana@example.com",
    ]);
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["no-es-un-email"],
    [12345],
    [["ana@example.com"]],
  ])(
    "con un email inválido (%j) responde 200 y no manda nada",
    async (email) => {
      await createUser({ email: "ana@example.com" });

      const res = await requestReset(email);
      await requestReset("ana@example.com");
      await waitForEmails(1);

      expect(res.status).toBe(200);
      expect(sendEmailMock.mock.calls[0][0].to).toBe("ana@example.com");
    },
  );

  it("guarda solo el hash del token y vence en una hora", async () => {
    await createUser({ email: "ana@example.com" });

    await requestReset("ana@example.com");
    await waitForEmails(1);
    const token = tokenFromEmail();
    const { rows } = await pool.query(
      "SELECT token_hash, extract(epoch FROM (expires_at - now()))::int AS seconds FROM password_resets",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(rows[0].token_hash).not.toContain(token);
    expect(rows[0].seconds).toBeGreaterThan(3500);
    expect(rows[0].seconds).toBeLessThanOrEqual(3600);
  });

  it("arma el link con FRONTEND_URL, no con el Host del pedido", async () => {
    await createUser({ email: "ana@example.com" });

    await api
      .post("/auth/forgot-password")
      .set("Host", "evil.example")
      .set("X-Forwarded-Host", "evil.example")
      .send({ email: "ana@example.com" });
    await waitForEmails(1);

    const { text, html } = sendEmailMock.mock.calls[0][0];
    expect(text).toContain("http://localhost:5173/restablecer#token=");
    expect(text).not.toContain("evil.example");
    expect(html).not.toContain("evil.example");
  });

  it("un pedido nuevo invalida el token anterior", async () => {
    await createUser({ email: "ana@example.com" });

    await requestReset("ana@example.com");
    await waitForEmails(1);
    await requestReset("ana@example.com");
    await waitForEmails(2);
    const primero = tokenFromEmail(0);
    const segundo = tokenFromEmail(1);

    const conElViejo = await resetPassword(primero);
    const conElNuevo = await resetPassword(segundo);

    expect(primero).not.toBe(segundo);
    expect(conElViejo.status).toBe(400);
    expect(conElNuevo.status).toBe(200);
  });
});

describe("POST /auth/reset-password", () => {
  it("cambia la contraseña, no abre sesión y borra el token", async () => {
    const { email, token } = await userWithResetToken();

    const res = await resetPassword(token);
    const conLaNueva = await login(email, NEW_PASSWORD);
    const conLaVieja = await login(email, PASSWORD);
    const pendientes = await pool.query(
      "SELECT count(*)::int AS total FROM password_resets",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(conLaNueva.status).toBe(200);
    expect(conLaVieja.status).toBe(401);
    expect(pendientes.rows[0].total).toBe(0);
  });

  it("el token sirve una sola vez", async () => {
    const { token } = await userWithResetToken();

    const primera = await resetPassword(token);
    const segunda = await resetPassword(token, "otra-clave-789");

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(400);
  });

  it("un token vencido se rechaza y la contraseña no cambia", async () => {
    const { email, token } = await userWithResetToken();
    await pool.query(
      "UPDATE password_resets SET expires_at = now() - interval '1 minute'",
    );

    const res = await resetPassword(token);
    const conLaVieja = await login(email, PASSWORD);

    expect(res.status).toBe(400);
    expect(conLaVieja.status).toBe(200);
  });

  it("un token que no existe se rechaza y la contraseña no cambia", async () => {
    const { email } = await userWithResetToken();

    const res = await resetPassword("a".repeat(43));
    const conLaVieja = await login(email, PASSWORD);

    expect(res.status).toBe(400);
    expect(conLaVieja.status).toBe(200);
  });

  it.each([
    ["sin token", undefined, NEW_PASSWORD],
    ["token demasiado corto", "corto", NEW_PASSWORD],
    ["token demasiado largo", "x".repeat(201), NEW_PASSWORD],
    ["contraseña de 7 caracteres", "a".repeat(43), "1234567"],
    ["contraseña que no es texto", "a".repeat(43), 12345678],
    ["sin contraseña", "a".repeat(43), undefined],
  ])("rechaza datos inválidos: %s", async (_caso, token, password) => {
    const res = await api
      .post("/auth/reset-password")
      .send({ token, password });

    expect(res.status).toBe(400);
  });

  it("una contraseña inválida no gasta el token", async () => {
    const { token } = await userWithResetToken();

    const demasiadoCorta = await resetPassword(token, "1234567");
    const valida = await resetPassword(token);

    expect(demasiadoCorta.status).toBe(400);
    expect(valida.status).toBe(200);
  });

  it("con dos pedidos a la vez con el mismo token, gana uno solo", async () => {
    const { email, token } = await userWithResetToken();

    const [a, b] = await Promise.all([
      resetPassword(token, "clave-nueva-A-123"),
      resetPassword(token, "clave-nueva-B-456"),
    ]);
    const [ganadora, perdedora] =
      a.status === 200
        ? ["clave-nueva-A-123", "clave-nueva-B-456"]
        : ["clave-nueva-B-456", "clave-nueva-A-123"];

    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect((await login(email, ganadora)).status).toBe(200);
    expect((await login(email, perdedora)).status).toBe(401);
  });

  it("revoca las sesiones abiertas al cambiar la contraseña, y la nueva sesión sirve", async () => {
    const user = await createUser({ email: "ana@example.com", password: PASSWORD });
    await requestReset(user.email);
    await waitForEmails(1);
    const antes = await api.get("/auth/me").set(auth(user));

    const res = await resetPassword(tokenFromEmail());
    const despues = await api.get("/auth/me").set(auth(user));
    const nueva = await login(user.email, NEW_PASSWORD);
    const conLaNueva = await api
      .get("/auth/me")
      .set({ Authorization: `Bearer ${nueva.body.token}` });

    expect(antes.status).toBe(200);
    expect(res.status).toBe(200);
    expect(despues.status).toBe(401);
    expect(nueva.status).toBe(200);
    expect(conLaNueva.status).toBe(200);
  });

  it("cierra también los chats de Telegram, las suscripciones push y los códigos de vínculo", async () => {
    const user = await createUser({ email: "ana@example.com", password: PASSWORD });
    const otra = await createUser({ email: "beto@example.com", password: PASSWORD });
    await pool.query("INSERT INTO telegram_links (chat_id, user_id) VALUES ('111111', $1), ('222222', $2)", [user.id, otra.id]);
    await pool.query(
      "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, 'https://fcm.googleapis.com/a', 'k', 'a'), ($2, 'https://fcm.googleapis.com/b', 'k', 'a')",
      [user.id, otra.id],
    );
    await pool.query(
      "INSERT INTO link_codes (code, user_id, expires_at) VALUES ('123456', $1, now() + interval '5 minutes')",
      [user.id],
    );
    await requestReset(user.email);
    await waitForEmails(1);

    await resetPassword(tokenFromEmail());

    const chats = await pool.query("SELECT user_id FROM telegram_links");
    const subs = await pool.query("SELECT user_id FROM push_subscriptions");
    const codes = await pool.query("SELECT 1 FROM link_codes");
    expect(chats.rows.map((r) => r.user_id)).toEqual([otra.id]);
    expect(subs.rows.map((r) => r.user_id)).toEqual([otra.id]);
    expect(codes.rowCount).toBe(0);
  });

  it.each([
    ["demasiado larga", "ñ".repeat(37)],
    ["de las más comunes", "12345678"],
  ])("una contraseña %s no gasta el token", async (_caso, password) => {
    const { email, token } = await userWithResetToken("ana@example.com");

    const rechazada = await resetPassword(token, password);
    const valida = await resetPassword(token);

    expect(rechazada.status).toBe(400);
    expect(valida.status).toBe(200);
    expect((await login(email, NEW_PASSWORD)).status).toBe(200);
  });
});
