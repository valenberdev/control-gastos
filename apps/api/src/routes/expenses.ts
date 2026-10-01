import { Router } from "express";
import { pool } from "../db/pool.js";
import { notifyUser } from "../services/push.js";
import {
  isUuid,
  isValidAmount,
  isValidDescription,
  isMonth,
} from "../lib/validation.js";

export const expensesRouter = Router();

expensesRouter.get("/", async (req, res) => {
  const { month } = req.query;
  const userId = req.userId!;

  if (month !== undefined && !isMonth(month)) {
    res.status(400).json({
      error: "El mes tiene que tener el formato AAAA-MM (por ejemplo 2026-09).",
    });
    return;
  }

  try {
    const result = month
      ? await pool.query(
          `SELECT id, amount, category_id, description, source, expense_date, created_at
           FROM expenses
           WHERE user_id = $1
             AND expense_date >= $2::date
             AND expense_date < ($2::date + interval '1 month')::date
           ORDER BY expense_date DESC, created_at DESC`,
          [userId, `${month}-01`],
        )
      : await pool.query(
          `SELECT id, amount, category_id, description, source, expense_date, created_at
           FROM expenses
           WHERE user_id = $1
           ORDER BY expense_date DESC, created_at DESC
           LIMIT 100`,
          [userId],
        );
    res.json(result.rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});

expensesRouter.post("/", async (req, res) => {
  const { amount, categoryId, description, source } = req.body;
  const userId = req.userId!;

  if (
    !isValidAmount(amount) ||
    !isUuid(categoryId) ||
    !isValidDescription(description) ||
    !["web", "telegram"].includes(source)
  ) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO expenses (user_id, amount, category_id, description, source, expense_date)
       VALUES ($1, $2, $3, $4, $5, (now() AT TIME ZONE (SELECT timezone FROM users WHERE id = $1))::date)
       RETURNING id, amount, category_id, description, source, expense_date, created_at`,
      [userId, amount, categoryId, description ?? null, source],
    );
    const expense = {
      ...result.rows[0],
      amount: Number(result.rows[0].amount),
    };
    res.status(201).json(expense);

    notifyUser(userId, {
      title: "Gasto registrado",
      body: `$${expense.amount}${description ? ` — ${description}` : ""}`,
    }).catch((err) => console.error("Error al notificar:", err));
  } catch (err) {
    const { code, constraint } = err as { code?: string; constraint?: string };
    if (code === "23503" && constraint === "expenses_category_id_fkey") {
      res.status(400).json({ error: "La categoría no existe" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear el gasto" });
  }
});

expensesRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const { amount, categoryId, description } = req.body;

  if (!isUuid(id)) {
    res.status(404).json({ error: "Gasto no encontrado" });
    return;
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (amount !== undefined) {
    if (!isValidAmount(amount)) {
      res.status(400).json({ error: "Monto inválido" });
      return;
    }
    values.push(amount);
    sets.push(`amount = $${values.length}`);
  }

  if (categoryId !== undefined) {
    if (!isUuid(categoryId)) {
      res.status(400).json({ error: "Categoría inválida" });
      return;
    }
    values.push(categoryId);
    sets.push(`category_id = $${values.length}`);
  }

  if (description !== undefined) {
    if (!isValidDescription(description)) {
      res.status(400).json({ error: "Descripción inválida" });
      return;
    }
    values.push(description?.trim() || null);
    sets.push(`description = $${values.length}`);
  }

  if (sets.length === 0) {
    res.status(400).json({ error: "No hay nada para actualizar" });
    return;
  }

  values.push(id, userId);

  try {
    const result = await pool.query(
      `UPDATE expenses SET ${sets.join(", ")}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING id, amount, category_id, description, source, expense_date, created_at`,
      values,
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: "Gasto no encontrado" });
      return;
    }
    res.json({ ...row, amount: Number(row.amount) });
  } catch (err) {
    if ((err as { code?: string }).code === "23503") {
      res.status(400).json({ error: "La categoría no existe" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el gasto" });
  }
});

expensesRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  if (!isUuid(id)) {
    res.status(404).json({ error: "Gasto no encontrado" });
    return;
  }

  try {
    const result = await pool.query(
      "DELETE FROM expenses WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Gasto no encontrado" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al borrar el gasto" });
  }
});
