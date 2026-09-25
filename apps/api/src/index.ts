import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiKeyAuth } from './middleware/auth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { expensesRouter } from './routes/expenses.js';
import { incomesRouter } from './routes/incomes.js';
import { balanceRouter } from './routes/balance.js';
import { reportsRouter } from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/categories', requireAuth, categoriesRouter);
app.use('/expenses', requireAuth, expensesRouter);
app.use('/incomes', apiKeyAuth, incomesRouter);
app.use('/balance', apiKeyAuth, balanceRouter);
app.use('/reports', apiKeyAuth, reportsRouter);

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});