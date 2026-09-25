import { Router } from "express";
import { pool } from "../db/pool.js";

export const incomesRouter = Router();

incomesRouter.get("/", async (req, res) => {
  const { month } = req.query;
  const userId = req.userId!;

  try {
    const result = month
      ? await pool.query(
          `SELECT id, amount, description, source, income_date, created_at
           FROM incomes
           WHERE user_id = $1
             AND date_trunc('month', income_date) = date_trunc('month', $2::date)
           ORDER BY income_date DESC, created_at DESC`,
          [userId, `${month}-01`],
        )
      : await pool.query(
          `SELECT id, amount, description, source, income_date, created_at
           FROM incomes
           WHERE user_id = $1
           ORDER BY income_date DESC, created_at DESC
           LIMIT 100`,
          [userId],
        );
    res.json(result.rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener ingresos" });
  }
});

incomesRouter.post("/", async (req, res) => {
  const { amount, description, source } = req.body;
  const userId = req.userId!;

  if (!amount || amount <= 0 || !["web", "telegram"].includes(source)) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO incomes (user_id, amount, description, source)
       VALUES ($1, $2, $3, $4)
       RETURNING id, amount, description, source, income_date, created_at`,
      [userId, amount, description ?? null, source],
    );
    res
      .status(201)
      .json({ ...result.rows[0], amount: Number(result.rows[0].amount) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el ingreso" });
  }
});
