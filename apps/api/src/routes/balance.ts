import { Router } from "express";
import { pool } from "../db/pool.js";
import { logError } from "../lib/logger.js";

export const balanceRouter = Router();

balanceRouter.get("/", async (req, res) => {
  const userId = req.userId!;

  try {
    const result = await pool.query(
      // MATERIALIZED: sin esto Postgres "inlina" la CTE y repite cada suma por cada
      // columna que la usa (medido: el doble de buffers y de tiempo).
      `WITH totals AS MATERIALIZED (
         SELECT
           COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1), 0) AS total_income,
           COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1), 0) AS total_expenses
       )
       SELECT total_income, total_expenses, total_income - total_expenses AS balance FROM totals`,
      [userId],
    );
    const row = result.rows[0];

    res.json({
      balance: Number(row.balance),
      totalIncome: Number(row.total_income),
      totalExpenses: Number(row.total_expenses),
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al calcular el saldo" });
  }
});
