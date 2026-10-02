import { Router } from "express";
import type { PoolClient } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { logError } from "../lib/logger.js";
import { signToken } from "../middleware/jwt.js";
import {
  forgetChat,
  forgetUser,
  requireAuth,
} from "../middleware/requireAuth.js";
import { requireInternalKey } from "../middleware/requireInternalKey.js";
import { APP_TIMEZONE } from "../config/timezone.js";
import {
  forgotPasswordEmailLimiter,
  forgotPasswordIpLimiter,
  linkCodeLimiter,
  linkTelegramLimiter,
  loginAccountGlobalLimiter,
  loginAccountLimiter,
  loginIpLimiter,
  registerLimiter,
  resetPasswordLimiter,
  deleteAccountLimiter,
  telegramTokenChatLimiter,
  telegramTokenIpLimiter,
} from "../middleware/rateLimit.js";
import { passwordResetEmail, sendEmail } from "../services/email.js";
import {
  isChatId,
  isLinkCode,
  passwordProblem,
} from "../lib/validation.js";

export const authRouter = Router();

const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8B0FMSUKUOJEOmMz+Bp9UPvcVzAoUq";

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

async function resolveTimezone(candidate: unknown): Promise<string> {
  if (typeof candidate === "string") {
    const found = await pool.query(
      "SELECT name FROM pg_timezone_names WHERE name = $1",
      [candidate],
    );
    if (found.rows[0]) return found.rows[0].name;
  }
  return APP_TIMEZONE;
}

authRouter.post("/register", registerLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password, timezone } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email inválido" });
    return;
  }

  const problem = passwordProblem(password);
  if (problem) {
    res.status(400).json({ error: problem });
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
    const userTimezone = await resolveTimezone(timezone);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, timezone) VALUES ($1, $2, $3) RETURNING id, email, timezone, token_version",
      [email, passwordHash, userTimezone],
    );
    const { token_version: version, ...user } = result.rows[0];
    const token = signToken({ userId: user.id, v: version });
    res.status(201).json({ token, user });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al registrar el usuario" });
  }
});

authRouter.post(
  "/login",
  loginIpLimiter,
  loginAccountLimiter,
  loginAccountGlobalLimiter,
  async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== "string") {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }

    try {
      const result = await pool.query(
        "SELECT id, email, password_hash, token_version FROM users WHERE email = $1",
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

      const token = signToken({ userId: user.id, v: user.token_version });
      res.status(200).json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  },
);

authRouter.post(
  "/link-code",
  requireAuth,
  linkCodeLimiter,
  async (req, res) => {
    const userId = req.userId!;
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

    try {
      await pool.query(
        "DELETE FROM link_codes WHERE user_id = $1 OR expires_at < now()",
        [userId],
      );
      await pool.query(
        "INSERT INTO link_codes (code, user_id, expires_at) VALUES ($1, $2, $3)",
        [code, userId, expiresAt],
      );
      res.status(201).json({ code, expiresAt });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Error al generar el código" });
    }
  },
);

authRouter.post(
  "/link-telegram",
  requireInternalKey,
  linkTelegramLimiter,
  async (req, res) => {
    const { code, chatId } = req.body;

    if (!isLinkCode(code) || !isChatId(chatId)) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }

    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const used = await client.query(
        "DELETE FROM link_codes WHERE code = $1 AND expires_at > now() RETURNING user_id",
        [code],
      );
      const row = used.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Código inválido o expirado" });
        return;
      }

      await client.query(
        `INSERT INTO telegram_links (chat_id, user_id) VALUES ($1, $2)
       ON CONFLICT (chat_id) DO UPDATE SET user_id = $2, linked_at = now()`,
        [chatId, row.user_id],
      );
      await client.query("COMMIT");

      res.status(200).json({ success: true });
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      logError(err);
      res.status(500).json({ error: "Error al vincular la cuenta" });
    } finally {
      client?.release();
    }
  },
);

authRouter.post(
  "/telegram-token",
  requireInternalKey,
  telegramTokenIpLimiter,
  telegramTokenChatLimiter,
  async (req, res) => {
    const { chatId } = req.body;

    if (!isChatId(chatId)) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT l.user_id, u.token_version
         FROM telegram_links l
         JOIN users u ON u.id = l.user_id
         WHERE l.chat_id = $1`,
        [chatId],
      );
      const row = result.rows[0];
      if (!row) {
        res.status(404).json({ error: "Chat no vinculado" });
        return;
      }

      // Token corto y atado al chat: deja de valer apenas se desvincula.
      const token = signToken(
        {
          userId: row.user_id,
          v: row.token_version,
          via: "telegram",
          chat: chatId,
        },
        "15m",
      );
      res.status(200).json({ token });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Error al generar el token" });
    }
  },
);

authRouter.get("/telegram", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT chat_id, linked_at FROM telegram_links WHERE user_id = $1 ORDER BY linked_at DESC",
      [req.userId!],
    );
    res.json(
      result.rows.map((r) => ({ chatId: r.chat_id, linkedAt: r.linked_at })),
    );
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al obtener los chats vinculados" });
  }
});

authRouter.delete("/telegram/:chatId", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { chatId } = req.params;

  if (!isChatId(chatId)) {
    res.status(404).json({ error: "Chat no encontrado" });
    return;
  }

  try {
    const result = await pool.query(
      "DELETE FROM telegram_links WHERE chat_id = $1 AND user_id = $2",
      [chatId, userId],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Chat no encontrado" });
      return;
    }
    forgetChat(userId, chatId);
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al desvincular el chat" });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, timezone FROM users WHERE id = $1",
      [req.userId!],
    );
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(user);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

authRouter.patch("/timezone", requireAuth, async (req, res) => {
  const { timezone } = req.body;

  if (typeof timezone !== "string") {
    res.status(400).json({ error: "Zona horaria inválida" });
    return;
  }

  try {
    const found = await pool.query(
      "SELECT name FROM pg_timezone_names WHERE name = $1",
      [timezone],
    );
    if (!found.rows[0]) {
      res.status(400).json({ error: "Zona horaria inválida" });
      return;
    }

    await pool.query("UPDATE users SET timezone = $1 WHERE id = $2", [
      found.rows[0].name,
      req.userId!,
    ]);
    res.json({ timezone: found.rows[0].name });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Error al actualizar la zona horaria" });
  }
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const LINK_CODE_TTL_MS = 10 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendPasswordReset(email: string): Promise<void> {
  const result = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  const user = result.rows[0];
  if (!user) return;

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await pool.query(
    "DELETE FROM password_resets WHERE user_id = $1 OR expires_at < now()",
    [user.id],
  );
  await pool.query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, hashToken(token), expiresAt],
  );

  const frontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");
  const link = `${frontendUrl}/restablecer#token=${token}`;

  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    console.log(`[DEV] Link de recuperación para ${email}: ${link}`);
    return;
  }

  await sendEmail({ to: email, ...passwordResetEmail(link) });
}

authRouter.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  (req, res) => {
    const email = normalizeEmail(req.body.email);

    res.json({
      message:
        "Si existe una cuenta con ese email, te mandamos un link para restablecer la contraseña.",
    });

    if (!email) return;
    sendPasswordReset(email).catch((err) =>
      logError(err, "recuperación"),
    );
  },
);

authRouter.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (
    typeof token !== "string" ||
    token.length < 20 ||
    token.length > 200
  ) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const problem = passwordProblem(password);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const used = await client.query(
      "DELETE FROM password_resets WHERE token_hash = $1 AND expires_at > now() RETURNING user_id",
      [hashToken(token)],
    );
    const row = used.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      res
        .status(400)
        .json({ error: "El link no es válido o ya venció. Pedí uno nuevo." });
      return;
    }

    // Cambiar la contraseña cierra todo lo que pudiera haber abierto otra
    // persona: las sesiones (se sube la versión), los chats de Telegram
    // vinculados, las suscripciones push y los códigos de vínculo pendientes.
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query(
      "UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2",
      [passwordHash, row.user_id],
    );
    await client.query("DELETE FROM password_resets WHERE user_id = $1", [
      row.user_id,
    ]);
    await client.query("DELETE FROM telegram_links WHERE user_id = $1", [
      row.user_id,
    ]);
    await client.query("DELETE FROM push_subscriptions WHERE user_id = $1", [
      row.user_id,
    ]);
    await client.query("DELETE FROM link_codes WHERE user_id = $1", [
      row.user_id,
    ]);
    await client.query("COMMIT");
    forgetUser(row.user_id);

    res.json({ success: true });
  } catch (err) {
    await client?.query("ROLLBACK").catch(() => {});
    logError(err);
    res.status(500).json({ error: "Error al restablecer la contraseña" });
  } finally {
    client?.release();
  }
});

authRouter.delete(
  "/me",
  requireAuth,
  deleteAccountLimiter,
  async (req, res) => {
    const userId = req.userId!;
    const { password } = req.body;

    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ error: "Falta la contraseña" });
      return;
    }

    try {
      const result = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId],
      );
      const hash: string | undefined = result.rows[0]?.password_hash;
      const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);

      if (!hash || !matches) {
        res.status(403).json({ error: "Contraseña incorrecta" });
        return;
      }

      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
      forgetUser(userId);
      res.json({ success: true });
    } catch (err) {
      logError(err);
      res.status(500).json({ error: "Error al eliminar la cuenta" });
    }
  },
);
