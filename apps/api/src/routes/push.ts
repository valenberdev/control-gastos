import { Router } from "express";
import { pool } from "../db/pool.js";

export const pushRouter = Router();

pushRouter.post("/subscribe", async (req, res) => {
  const userId = req.userId!;
  const { endpoint, keys } = req.body;

  if (
    typeof endpoint !== "string" ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    res.status(400).json({ error: "Datos de suscripción inválidos" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [userId, endpoint, keys.p256dh, keys.auth],
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Error al eliminar la suscripción" });
  }
});
