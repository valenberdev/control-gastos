import { Router } from 'express';
import { pool } from '../db/pool.js';
import { logError } from "../lib/logger.js";

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, icon, monthly_budget FROM categories ORDER BY name',
    );
    res.json(result.rows);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});