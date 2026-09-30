import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireInternalKey } from "./middleware/requireInternalKey.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { expensesRouter } from "./routes/expenses.js";
import { incomesRouter } from "./routes/incomes.js";
import { balanceRouter } from "./routes/balance.js";
import { reportsRouter } from "./routes/reports.js";
import { pushRouter } from "./routes/push.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 0;
if (trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/debug/ip", requireInternalKey, (req, res) => {
  res.json({
    ip: req.ip,
    xForwardedFor: req.headers["x-forwarded-for"] ?? null,
    remoteAddress: req.socket.remoteAddress,
  });
});

app.use("/auth", authRouter);
app.use("/categories", requireAuth, categoriesRouter);
app.use("/expenses", requireAuth, expensesRouter);
app.use("/incomes", requireAuth, incomesRouter);
app.use("/balance", requireAuth, balanceRouter);
app.use("/reports", requireAuth, reportsRouter);
app.use("/push", requireAuth, pushRouter);

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});
