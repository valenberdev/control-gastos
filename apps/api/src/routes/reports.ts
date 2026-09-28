import { Router } from "express";
import { pool } from "../db/pool.js";
import { APP_TIMEZONE } from "../config/timezone.js";

export const reportsRouter = Router();

const PERIOD_COUNTS = {
  day: 14,
  week: 8,
  month: 6,
} as const;

type Period = keyof typeof PERIOD_COUNTS;

function isPeriod(value: unknown): value is Period {
  return value === "day" || value === "week" || value === "month";
}

reportsRouter.get("/trend", async (req, res) => {
  const period: Period = isPeriod(req.query.period)
    ? req.query.period
    : "month";
  const count = PERIOD_COUNTS[period];
  const userId = req.userId!;

  try {
    const result = await pool.query(
      `WITH buckets AS (
         SELECT generate_series(
           date_trunc($2::text, now() AT TIME ZONE $4::text) - ($3::int - 1) * ('1 ' || $2::text)::interval,
           date_trunc($2::text, now() AT TIME ZONE $4::text),
           ('1 ' || $2::text)::interval
         ) AS bucket
       )
       SELECT
         to_char(b.bucket, 'YYYY-MM-DD') AS bucket,
         COALESCE(i.total, 0) AS income,
         COALESCE(e.total, 0) AS expenses
       FROM buckets b
       LEFT JOIN (
         SELECT date_trunc($2::text, income_date::timestamp) AS bucket, SUM(amount) AS total
         FROM incomes WHERE user_id = $1 GROUP BY 1
       ) i ON i.bucket = b.bucket
       LEFT JOIN (
         SELECT date_trunc($2::text, expense_date::timestamp) AS bucket, SUM(amount) AS total
         FROM expenses WHERE user_id = $1 GROUP BY 1
       ) e ON e.bucket = b.bucket
       ORDER BY b.bucket`,
      [userId, period, count, APP_TIMEZONE],
    );
    res.json(
      result.rows.map((r) => ({
        bucket: r.bucket,
        income: Number(r.income),
        expenses: Number(r.expenses),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al calcular la tendencia" });
  }
});
