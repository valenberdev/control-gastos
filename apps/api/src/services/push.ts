import webpush from "web-push";
import { pool } from "../db/pool.js";

webpush.setVapidDetails(
  "mailto:vaberdini@gmail.com",
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
