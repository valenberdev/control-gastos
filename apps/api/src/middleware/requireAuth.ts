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

const CACHE_TTL_MS = 30_000;
const MAX_CACHED = 10_000;
const versions = new Map<string, { version: number; checkedAt: number }>();
const linkedChats = new Map<string, number>();
const pendingVersions = new Map<string, Promise<number | null>>();

let invalidations = 0;

export function forgetUser(userId: string): void {
  invalidations++;
  versions.delete(userId);
  pendingVersions.delete(userId);
  for (const key of linkedChats.keys()) {
    if (key.startsWith(`${userId}:`)) linkedChats.delete(key);
  }
}

export function forgetChat(userId: string, chatId: string): void {
  invalidations++;
  linkedChats.delete(`${userId}:${chatId}`);
}

async function sessionVersion(userId: string): Promise<number | null> {
  const cached = versions.get(userId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.version;
  }

  const pending = pendingVersions.get(userId);
  if (pending) return pending;

  const lookup: Promise<number | null> = (async () => {
    const startedAt = invalidations;
    const result = await pool.query(
      "SELECT token_version FROM users WHERE id = $1",
      [userId],
    );
    if (result.rowCount === 0) {
      versions.delete(userId);
      return null;
    }

    const version = Number(result.rows[0].token_version);
    if (invalidations === startedAt) {
      if (versions.size >= MAX_CACHED) versions.clear();
      versions.set(userId, { version, checkedAt: Date.now() });
    }
    return version;
  })().finally(() => {
    if (pendingVersions.get(userId) === lookup) pendingVersions.delete(userId);
  });

  pendingVersions.set(userId, lookup);
  return lookup;
}

async function chatIsLinked(userId: string, chatId: string): Promise<boolean> {
  const key = `${userId}:${chatId}`;
  const checkedAt = linkedChats.get(key);
  if (checkedAt !== undefined && Date.now() - checkedAt < CACHE_TTL_MS) {
    return true;
  }

  const startedAt = invalidations;
  const result = await pool.query(
    "SELECT 1 FROM telegram_links WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId],
  );
  if (result.rowCount === 0) {
    linkedChats.delete(key);
    return false;
  }

  if (invalidations === startedAt) {
    if (linkedChats.size >= MAX_CACHED) linkedChats.clear();
    linkedChats.set(key, Date.now());
  }
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
