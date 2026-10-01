import webpush from "web-push";
import { pool } from "../db/pool.js";

// El asunto VAPID identifica a quien envía los push y tiene que ser una URL
// https: o mailto:. Se configura con VAPID_SUBJECT; si falta, se usa el
// frontend cuando es https, y en desarrollo un placeholder (web-push rechaza
// http://localhost).
function vapidSubject(): string {
  const explicit = process.env.VAPID_SUBJECT;
  if (explicit) return explicit;

  const frontend = process.env.FRONTEND_URL;
  if (frontend?.startsWith("https://")) return frontend;

  return "mailto:dev@example.com";
}

webpush.setVapidDetails(
  vapidSubject(),
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface NotificationPayload {
  title: string;
  body: string;
}

export async function notifyUser(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  const result = await pool.query(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
    [userId],
  );

  await Promise.all(
    result.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [
            sub.id,
          ]);
        } else {
          console.error("Error enviando push:", err);
        }
      }
    }),
  );
}
