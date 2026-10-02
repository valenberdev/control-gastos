import webpush from "web-push";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../db/pool.js";
import {
  api,
  auth,
  categoryId,
  closePool,
  createUser,
  resetDb,
  type TestUser,
} from "./helpers.js";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
afterAll(closePool);

// Claves con la forma real: P-256 sin comprimir (65 bytes) y secreto de 16 bytes.
const KEYS = { p256dh: "B" + "A".repeat(86), auth: "A".repeat(22) };
const FCM = "https://fcm.googleapis.com/fcm/send/dispositivo-";

function subscribe(user: TestUser, body: Record<string, unknown>) {
  return api.post("/push/subscribe").set(auth(user)).send(body);
}

describe("POST /push/subscribe", () => {
  it.each([
    ["FCM (Chrome, Edge, Brave)", `${FCM}1`],
    ["Mozilla (Firefox)", "https://updates.push.services.mozilla.com/wpush/v2/abc"],
    ["Apple (Safari)", "https://web.push.apple.com/QWxhZGRpbg"],
    ["Windows", "https://wns2-par02p.notify.windows.com/w/?token=abc"],
  ])("acepta el servicio de notificaciones de %s", async (_nombre, endpoint) => {
    const user = await createUser();

    const res = await subscribe(user, { endpoint, keys: KEYS });

    expect(res.status).toBe(201);
  });

  it.each([
    ["con http en lugar de https", "http://fcm.googleapis.com/fcm/send/x"],
    ["con un host que no es de un servicio de push", "https://evil.example/push"],
    ["apuntando a la propia máquina", "https://127.0.0.1/push"],
    ["apuntando a localhost", "https://localhost/push"],
    ["con un puerto", "https://fcm.googleapis.com:8443/fcm/send/x"],
    ["con usuario y clave", "https://u:p@fcm.googleapis.com/fcm/send/x"],
    ["que termina en un host parecido", "https://fcm.googleapis.com.evil.example/x"],
    ["demasiado largo", `${FCM}${"a".repeat(2100)}`],
    ["que no es una URL", "no-es-una-url"],
  ])("rechaza un endpoint %s", async (_caso, endpoint) => {
    const user = await createUser();

    const res = await subscribe(user, { endpoint, keys: KEYS });
    const guardadas = await pool.query(
      "SELECT count(*)::int AS total FROM push_subscriptions",
    );

    expect(res.status).toBe(400);
    expect(guardadas.rows[0].total).toBe(0);
  });

  it.each([
    ["p256dh demasiado corta", { p256dh: "abc", auth: KEYS.auth }],
    ["auth con caracteres inválidos", { p256dh: KEYS.p256dh, auth: "***".repeat(8) }],
    ["claves de tipo número", { p256dh: 1, auth: 2 }],
  ])("rechaza claves inválidas: %s", async (_caso, keys) => {
    const user = await createUser();

    const res = await subscribe(user, { endpoint: `${FCM}1`, keys });

    expect(res.status).toBe(400);
  });

  it("tiene un tope de 10 dispositivos por cuenta, y volver a suscribir uno existente no cuenta", async () => {
    const user = await createUser();
    for (let i = 1; i <= 10; i++) {
      const res = await subscribe(user, { endpoint: `${FCM}${i}`, keys: KEYS });
      expect(res.status).toBe(201);
    }

    const undecima = await subscribe(user, { endpoint: `${FCM}11`, keys: KEYS });
    const repetida = await subscribe(user, { endpoint: `${FCM}1`, keys: KEYS });

    expect(undecima.status).toBe(400);
    expect(repetida.status).toBe(201);
  });
});

describe("envío de notificaciones", () => {
  it("cada pedido al servicio de push tiene un tiempo máximo", async () => {
    const send = vi
      .spyOn(webpush, "sendNotification")
      .mockResolvedValue({ statusCode: 201, body: "", headers: {} });
    const user = await createUser();
    await subscribe(user, { endpoint: `${FCM}1`, keys: KEYS });

    const res = await api
      .post("/expenses")
      .set(auth(user))
      .send({ amount: 100, categoryId: await categoryId(), source: "web" });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    expect(res.status).toBe(201);
    expect(send.mock.calls[0][2]).toMatchObject({ timeout: 10_000 });
  });
});
