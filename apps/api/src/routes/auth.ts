import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { signToken } from "../middleware/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireInternalKey } from "../middleware/requireInternalKey.js";

export const authRouter = Router();

const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8B0FMSUKUOJEOmMz+Bp9UPvcVzAoUq";

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    res
      .status(400)
      .json({
        error: "Email inválido o contraseña muy corta (mínimo 8 caracteres)",
      });
    return;
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta con ese email" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, passwordHash],
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar el usuario" });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email],
    );
    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password_hash ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const token = signToken({ userId: user.id });
    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

authRouter.post("/link-code", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await pool.query(
      "INSERT INTO link_codes (code, user_id, expires_at) VALUES ($1, $2, $3)",
      [code, userId, expiresAt],
    );
    res.status(201).json({ code, expiresAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar el código" });
  }
});

authRouter.post("/link-telegram", requireInternalKey, async (req, res) => {
  const { code, chatId } = req.body;

  if (typeof code !== "string" || typeof chatId !== "string") {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT user_id FROM link_codes WHERE code = $1 AND expires_at > now()",
      [code],
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: "Código inválido o expirado" });
      return;
    }

    await pool.query(
      `INSERT INTO telegram_links (chat_id, user_id) VALUES ($1, $2)
       ON CONFLICT (chat_id) DO UPDATE SET user_id = $2, linked_at = now()`,
      [chatId, row.user_id],
    );
    await pool.query("DELETE FROM link_codes WHERE code = $1", [code]);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al vincular la cuenta" });
  }
});

authRouter.post("/telegram-token", requireInternalKey, async (req, res) => {
  const { chatId } = req.body;

  if (typeof chatId !== "string") {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT user_id FROM telegram_links WHERE chat_id = $1",
      [chatId],
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: "Chat no vinculado" });
      return;
    }

    const token = signToken({ userId: row.user_id });
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar el token" });
  }
});
