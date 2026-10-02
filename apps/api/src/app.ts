import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { logError } from "./lib/logger.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { expensesRouter } from "./routes/expenses.js";
import { incomesRouter } from "./routes/incomes.js";
import { balanceRouter } from "./routes/balance.js";
import { reportsRouter } from "./routes/reports.js";
import { pushRouter } from "./routes/push.js";

export const app = express();

app.disable("x-powered-by");

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 0;
if (trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
} else if (process.env.NODE_ENV === "production") {
  console.warn(
    "TRUST_PROXY_HOPS no está configurada: detrás de un proxy todos los clientes comparten la misma IP en los límites de intentos.",
  );
}

const frontendUrl = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/+$/, "");
if (!process.env.FRONTEND_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "FRONTEND_URL no está configurada: CORS solo va a aceptar http://localhost:5173.",
  );
}

// La API solo devuelve JSON: ninguna página se puede incrustar ni cargar recursos.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "local",
  });
});

app.use("/auth", authRouter);
app.use("/categories", requireAuth, categoriesRouter);
app.use("/expenses", requireAuth, expensesRouter);
app.use("/incomes", requireAuth, incomesRouter);
app.use("/balance", requireAuth, balanceRouter);
app.use("/reports", requireAuth, reportsRouter);
app.use("/push", requireAuth, pushRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "No encontrado" });
});

// Manejador final: nunca devuelve trazas ni rutas internas, sea cual sea NODE_ENV.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number })?.status;

  if (status === 413) {
    res.status(413).json({ error: "El pedido es demasiado grande" });
    return;
  }
  if (status === 400) {
    res.status(400).json({ error: "El cuerpo del pedido no es un JSON válido" });
    return;
  }

  logError(err, "no manejado");
  res.status(500).json({ error: "Error interno" });
});
