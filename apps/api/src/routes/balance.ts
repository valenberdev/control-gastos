import { Router } from 'express';
import { pool } from '../db/pool.js';

export const balanceRouter = Router();

balanceRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE((SELECT SUM(amount) FROM incomes), 0) AS total_income,
        COALESCE((SELECT SUM(amount) FROM expenses), 0) AS total_expenses
    `);
    const totalIncome = Number(result.rows[0].total_income);
    const totalExpenses = Number(result.rows[0].total_expenses);

    res.json({
      balance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular el saldo' });
  }
});