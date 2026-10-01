import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool.js";
import { isUuid } from "../lib/validation.js";
import { verifyToken } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const KNOWN_USER_TTL_MS = 30_000;
const MAX_KNOWN_USERS = 10_000;
const knownUsers = new Map<string, number>();

export function forgetUser(userId: string): void {
  knownUsers.delete(userId);
}

async function userExists(userId: string): Promise<boolean> {
  const checkedAt = knownUsers.get(userId);
  if (checkedAt !== undefined && Date.now() - checkedAt < KNOWN_USER_TTL_MS)
    return true;

  const result = await pool.query("SELECT 1 FROM users WHERE id = $1", [
    userId,
  ]);
  if (result.rowCount === 0) {
    knownUsers.delete(userId);
    return false;
  }

  if (knownUsers.size >= MAX_KNOWN_USERS) knownUsers.clear();
  knownUsers.set(userId, Date.now());
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

  let userId: unknown;
  try {
    userId = verifyToken(token).userId;
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }

  if (!isUuid(userId)) {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }

  try {
    if (!(await userExists(userId))) {
      res.status(401).json({ error: "La sesión ya no es válida" });
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al validar la sesión" });
    return;
  }

  req.userId = userId;
  next();
}
