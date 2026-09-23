import { Router } from 'express';
import { pool } from '../db/pool.js';

export const reportsRouter = Router();

reportsRouter.get('/trend', async (req, res) => {
  const months = Number(req.query.months) || 6;

  try {
    const result = await pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', now()) - interval '1 month' * ($1::int - 1),
           date_trunc('month', now()),
           interval '1 month'
         ) AS month
       )
       SELECT
         to_char(m.month, 'YYYY-MM') AS month,
         COALESCE(i.total, 0) AS income,
         COALESCE(e.total, 0) AS expenses
       FROM months m
       LEFT JOIN (
         SELECT date_trunc('month', income_date) AS month, SUM(amount) AS total
         FROM incomes GROUP BY 1
       ) i ON i.month = m.month
       LEFT JOIN (
         SELECT date_trunc('month', expense_date) AS month, SUM(amount) AS total
         FROM expenses GROUP BY 1
       ) e ON e.month = m.month
       ORDER BY m.month`,
      [months],
    );
    res.json(
      result.rows.map((r) => ({
        month: r.month,
        income: Number(r.income),
        expenses: Number(r.expenses),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular la tendencia' });
  }
});