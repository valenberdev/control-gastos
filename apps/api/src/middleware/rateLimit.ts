import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const MINUTE = 60 * 1000;

const base = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  skip: () =>
    process.env.NODE_ENV !== "production" &&
    process.env.RATE_LIMIT_DISABLED === "true",
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

// Tope por cuenta sin mirar la IP: frena un ataque repartido entre muchas IP
// contra una misma cuenta. Es alto para que bloquear a otra persona cueste.
export const loginAccountGlobalLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 50,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `cuenta|${normalizedEmail(req) || clientIp(req)}`,
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

export const forgotPasswordIpLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 5,
});

export const forgotPasswordEmailLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 3,
  keyGenerator: (req) => normalizedEmail(req) || clientIp(req),
});

export const resetPasswordLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const deleteAccountLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.userId ?? clientIp(req),
});

// Pedidos del bot para canjear un chat por un token. Los usa un solo cliente (el
// bot), así que el tope por IP es alto: sirve contra quien enumere chats con una
// clave interna filtrada, no contra el uso normal.
export const telegramTokenChatLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 30,
  keyGenerator: (req) => {
    const chatId = req.body?.chatId;
    return typeof chatId === "string" ? chatId.slice(0, 64) : "sin-chat";
  },
});

export const telegramTokenIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 600,
});

export const pushSubscribeLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 30,
  keyGenerator: (req) => req.userId ?? clientIp(req),
});
