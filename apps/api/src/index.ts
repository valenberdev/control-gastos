import express from 'express';
import dotenv from 'dotenv';
import { apiKeyAuth } from './middleware/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { expensesRouter } from './routes/expenses.js';
import { incomesRouter } from './routes/incomes.js';
import { balanceRouter } from './routes/balance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/categories', apiKeyAuth, categoriesRouter);
app.use('/expenses', apiKeyAuth, expensesRouter);
app.use('/incomes', apiKeyAuth, incomesRouter);
app.use('/balance', apiKeyAuth, balanceRouter);

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});