import type { Request, Response, NextFunction } from "express";

export function requireInternalKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.header("x-internal-key");

  if (!key || key !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  next();
}
