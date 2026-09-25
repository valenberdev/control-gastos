import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { signToken } from "../middleware/jwt.js";

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
