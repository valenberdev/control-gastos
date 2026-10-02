import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool.js";
import { isChatId, isUuid } from "../lib/validation.js";
import { logError } from "../lib/logger.js";
import { verifyToken } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Para no consultar la base en cada pedido se recuerda 30 segundos la versión
// de sesión de cada cuenta y si un chat sigue vinculado. Los cambios hechos en
// esta misma instancia (borrar la cuenta, restablecer la contraseña, desvincular
// un chat) limpian la caché al instante.
const CACHE_TTL_MS = 30_000;
const MAX_CACHED = 10_000;
const versions = new Map<string, { version: number; checkedAt: number }>();
const linkedChats = new Map<string, number>();

export function forgetUser(userId: string): void {
  versions.delete(userId);
  pendingVersions.delete(userId);
  for (const key of linkedChats.keys()) {
    if (key.startsWith(`${userId}:`)) linkedChats.delete(key);
  }
}

export function forgetChat(userId: string, chatId: string): void {
  linkedChats.delete(`${userId}:${chatId}`);
}

// Consultas en curso por usuario: el dashboard hace 4 o 5 pedidos a la vez y, con la
// caché vacía, todos preguntaban lo mismo a la base.
const pendingVersions = new Map<string, Promise<number | null>>();

// Versión de sesión vigente de la cuenta, o null si la cuenta ya no existe.
async function sessionVersion(userId: string): Promise<number | null> {
  const cached = versions.get(userId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.version;
  }

  const pending = pendingVersions.get(userId);
  if (pending) return pending;

  const lookup = (async () => {
    const result = await pool.query(
      "SELECT token_version FROM users WHERE id = $1",
      [userId],
    );
    if (result.rowCount === 0) {
      versions.delete(userId);
      return null;
    }

    const version = Number(result.rows[0].token_version);
    if (versions.size >= MAX_CACHED) versions.clear();
    versions.set(userId, { version, checkedAt: Date.now() });
    return version;
  })().finally(() => pendingVersions.delete(userId));

  pendingVersions.set(userId, lookup);
  return lookup;
}

async function chatIsLinked(userId: string, chatId: string): Promise<boolean> {
  const key = `${userId}:${chatId}`;
  const checkedAt = linkedChats.get(key);
  if (checkedAt !== undefined && Date.now() - checkedAt < CACHE_TTL_MS) {
    return true;
  }

  const result = await pool.query(
    "SELECT 1 FROM telegram_links WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId],
  );
  if (result.rowCount === 0) {
    linkedChats.delete(key);
    return false;
  }

  if (linkedChats.size >= MAX_CACHED) linkedChats.clear();
  linkedChats.set(key, Date.now());
  return true;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }

  const userId: unknown = payload.userId;
  if (!isUuid(userId)) {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }

  try {
    const current = await sessionVersion(userId);
    if (current === null || (payload.v ?? 0) !== current) {
      res.status(401).json({ error: "La sesión ya no es válida" });
      return;
    }

    if (payload.via === "telegram") {
      const chat: unknown = payload.chat;
      if (!isChatId(chat) || !(await chatIsLinked(userId, chat))) {
        res.status(401).json({ error: "La sesión ya no es válida" });
        return;
      }
    }
  } catch (err) {
    logError(err, "requireAuth");
    res.status(500).json({ error: "Error al validar la sesión" });
    return;
  }

  req.userId = userId;
  next();
}
