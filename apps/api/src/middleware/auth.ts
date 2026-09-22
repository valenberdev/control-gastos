import type { Request, Response, NextFunction } from 'express';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-api-key');

  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  next();
}