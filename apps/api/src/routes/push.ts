import { Router } from "express";
import { pool } from "../db/pool.js";
import { logError } from "../lib/logger.js";
import { pushSubscribeLimiter } from "../middleware/rateLimit.js";
import {
  MAX_PUSH_SUBSCRIPTIONS_PER_USER,
  isPushEndpoint,
  isPushKey,
} from "../lib/validation.js";

export const pushRouter = Router();

pushRouter.post("/subscribe", pushSubscribeLimiter, async (req, res) => {
  const userId = req.userId!;
  const { endpoint, keys } = req.body;

  if (
    !isPushEndpoint(endpoint) ||
    !isPushKey(keys?.p256dh, 80, 100) ||
    !isPushKey(keys?.auth, 16, 32)
  ) {
    res.status(400).json({ error: "Datos de suscripción inválidos" });
    return;
  }

  try {
    const known = await pool.query(
      "SELECT 1 FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2",
      [endpoint, userId],
    );
    if (known.rowCount === 0) {
      const count = await pool.query(
        "SELECT count(*)::int AS total FROM push_subscriptions WHERE user_id = $1",
        [userId],
      );
      if (count.rows[0].total >= MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
        res.status(400).json({
          error: `Llegaste al máximo de ${MAX_PUSH_SUBSCRIPTIONS_PER_USER} dispositivos con notificaciones`,
        });
        return;
      }
    }

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [userId, endpoint, keys.p256dh, keys.auth],
    );
    res.status(201).json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al guardar la suscripción" });
  }
});

pushRouter.delete("/subscribe", async (req, res) => {
  const userId = req.userId!;
  const { endpoint } = req.body;

  if (typeof endpoint !== "string") {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    await pool.query(
      "DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2",
      [endpoint, userId],
    );
    res.status(200).json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al eliminar la suscripción" });
  }
});
