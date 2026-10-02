import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Falta JWT_SECRET: la API no puede firmar sesiones.");
}
if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  console.warn(
    "JWT_SECRET tiene menos de 32 caracteres: conviene un valor aleatorio más largo.",
  );
}

export interface JwtPayload {
  userId: string;
  // Versión de sesión de la cuenta (users.token_version). Sin versión cuenta como 0.
  v?: number;
  // Los tokens que entrega la API al bot llevan el chat del que salen y vencen antes.
  via?: "telegram";
  chat?: string;
}

export function signToken(
  payload: JwtPayload,
  expiresIn: "7d" | "15m" = "7d",
): string {
  return jwt.sign(payload, JWT_SECRET!, { algorithm: "HS256", expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!, { algorithms: ["HS256"] }) as JwtPayload;
}
