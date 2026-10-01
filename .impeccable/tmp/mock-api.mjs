import http from "node:http";

const cats = ["comida", "transporte", "entretenimiento", "salud", "servicios", "otros"].map((name, i) => ({
  id: `c${i}`,
  name,
  icon: null,
  monthly_budget: null,
}));

const now = new Date();
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const d = (n) => `${ym}-${String(n).padStart(2, "0")}`;
const ts = (n, h) => `${d(n)}T${String(h).padStart(2, "0")}:15:00.000Z`;

const expenses = [
  ["c0", 18400, "Super Coto", 28, 18],
  ["c1", 3500, "Uber", 28, 12],
  ["c0", 9200, "Almuerzo con equipo", 27, 15],
  ["c4", 52300, "Luz y gas", 25, 10],
  ["c2", 14500, "Cine", 24, 22],
  ["c3", 8900, "Farmacia", 22, 9],
  ["c1", 12000, "Nafta", 21, 8],
  ["c0", 22100, "Verdulería y carnicería", 19, 17],
  ["c5", 6700, "Regalo cumpleaños", 15, 14],
  ["c4", 38000, "Internet y celular", 10, 11],
].map(([category_id, amount, description, day, h], i) => ({
  id: `e${i}`,
  amount,
  category_id,
  description,
  source: i % 3 === 0 ? "telegram" : "web",
  expense_date: d(day),
  created_at: ts(day, h),
}));

const incomes = [
  [850000, "Sueldo", 5, 9],
  [120000, "Trabajo freelance", 18, 16],
].map(([amount, description, day, h], i) => ({
  id: `i${i}`,
  amount,
  description,
  source: "web",
  income_date: d(day),
  created_at: ts(day, h),
}));

const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);

function trend(period) {
  const n = period === "month" ? 6 : period === "week" ? 8 : 14;
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(now);
    if (period === "month") date.setMonth(now.getMonth() - (n - 1 - i), 1);
    else if (period === "week") date.setDate(now.getDate() - (n - 1 - i) * 7);
    else date.setDate(now.getDate() - (n - 1 - i));
    const bucket = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      bucket,
      income: i % 4 === 1 ? 850000 + i * 9000 : 90000 + ((i * 53000) % 160000),
      expenses: 120000 + ((i * 91000) % 340000),
    };
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const url = new URL(req.url, "http://x");
  const json = (data, code = 200) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  switch (url.pathname) {
    case "/categories": return json(cats);
    case "/balance": return json({ balance: totalIncome - totalExpenses, totalIncome, totalExpenses });
    case "/reports/trend": return json(trend(url.searchParams.get("period") || "month"));
    case "/expenses": return json(expenses);
    case "/incomes": return json(incomes);
    case "/auth/me": return json({ id: "u1", email: "valentino@ejemplo.com", timezone: "America/Argentina/Buenos_Aires" });
    case "/auth/link-code": return json({ code: "K7M4QX", expiresAt: new Date(Date.now() + 9 * 60 * 1000).toISOString() });
    default: return json({ error: "no" }, 404);
  }
});
server.listen(3999, () => console.log("mock api on 3999"));
