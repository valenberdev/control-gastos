import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/requireAuth.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { expensesRouter } from "./routes/expenses.js";
import { incomesRouter } from "./routes/incomes.js";
import { balanceRouter } from "./routes/balance.js";
import { reportsRouter } from "./routes/reports.js";
import { pushRouter } from "./routes/push.js";

export const app = express();

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 0;
if (trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

const frontendUrl = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/+$/, "");
if (!process.env.FRONTEND_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "FRONTEND_URL no está configurada: CORS solo va a aceptar http://localhost:5173.",
  );
}

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
