import { Router } from 'express';
import { pool } from '../db/pool.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, icon, monthly_budget FROM categories ORDER BY name',
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});