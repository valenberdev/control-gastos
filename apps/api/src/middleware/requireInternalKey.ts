import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value).digest();
}

function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

export function requireInternalKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.header("x-internal-key");
  const expected = process.env.INTERNAL_API_KEY;

  if (!key || !expected || !safeEqual(key, expected)) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  next();
}
