import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const MINUTE = 60 * 1000;

const base = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
  },
};

function clientIp(req: Request): string {
  return ipKeyGenerator(req.ip ?? "unknown");
}

function normalizedEmail(req: Request): string {
  const email = req.body?.email;
  return typeof email === "string"
    ? email.trim().toLowerCase().slice(0, 254)
    : "";
}

export const loginIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 30,
  skipSuccessfulRequests: true,
});

export const loginAccountLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${clientIp(req)}|${normalizedEmail(req)}`,
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 10,
});

export const linkCodeLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 10,
  keyGenerator: (req) => req.userId ?? clientIp(req),
});

export const linkTelegramLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const chatId = req.body?.chatId;
    return typeof chatId === "string" ? chatId.slice(0, 64) : "sin-chat";
  },
});
