import http from "node:http";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_URL = (process.env.API_URL || "http://api:3000").replace(/\/+$/, "");
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY!;
const BOT_MODE = process.env.BOT_MODE || "polling";
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  (process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "")}/webhook`
    : undefined);

const bot = new Bot(TELEGRAM_BOT_TOKEN);

const recentUpdateIds = new Set<number>();
bot.use(async (ctx, next) => {
  const id = ctx.update.update_id;
  if (recentUpdateIds.has(id)) return;
  recentUpdateIds.add(id);
  if (recentUpdateIds.size > 500) {
    const oldest = recentUpdateIds.values().next().value;
    if (oldest !== undefined) recentUpdateIds.delete(oldest);
  }
  await next();
});

bot.use(async (ctx, next) => {
  if (ctx.chat && ctx.chat.type !== "private") {
    await ctx.reply(
      "Este bot solo funciona en chats privados, uno a uno. No respondo en grupos.",
    );
    return;
  }
  await next();
});

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  comida: [
    "comida",
    "super",
    "almuerzo",
    "cena",
    "desayuno",
    "restaurante",
    "delivery",
  ],
  transporte: ["transporte", "uber", "colectivo", "nafta", "taxi", "subte"],
  entretenimiento: ["entretenimiento", "cine", "streaming", "salida", "bar"],
  salud: ["salud", "farmacia", "medico", "remedios"],
  servicios: ["servicios", "luz", "gas", "internet", "alquiler", "celular"],
  otros: ["otros"],
};

let categoryIds: Record<string, string> = {};

async function ensureCategories(token: string): Promise<void> {
  if (Object.keys(categoryIds).length > 0) return;
  const res = await fetch(`${API_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
  const categories = (await res.json()) as { id: string; name: string }[];
  categoryIds = Object.fromEntries(categories.map((c) => [c.name, c.id]));
}

function matchCategory(text: string): string | null {
  const words = text.toLowerCase().split(/\s+/);
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some((syn) => words.includes(syn))) return category;
  }
  return null;
}

async function linkTelegram(code: string, chatId: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/link-telegram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify({ code, chatId }),
  });
  return res.ok;
}

const tokenCache = new Map<string, { token: string; cachedAt: number }>();
const TOKEN_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 días, por debajo de los 7 del JWT

async function getTokenForChat(chatId: string): Promise<string | null> {
  const cached = tokenCache.get(chatId);
  if (cached && Date.now() - cached.cachedAt < TOKEN_TTL_MS) {
    return cached.token;
  }

  const res = await fetch(`${API_URL}/auth/telegram-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify({ chatId }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { token: string };
  tokenCache.set(chatId, { token: data.token, cachedAt: Date.now() });
  return data.token;
}

async function createExpense(
  token: string,
  amount: number,
  category: string,
  description: string,
) {
  const categoryId = categoryIds[category];
  const res = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      categoryId,
      description,
      source: "telegram",
    }),
  });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
}

async function createIncome(
  token: string,
  amount: number,
  description: string,
) {
  const res = await fetch(`${API_URL}/incomes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, description, source: "telegram" }),
  });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
}

const pendingExpenses = new Map<
  string,
  { amount: number; description: string; token: string }
>();

bot.command("vincular", async (ctx) => {
  const code = ctx.match?.toString().trim();
  if (!code) {
    await ctx.reply(
      "Mandá el código junto con el comando, por ejemplo: /vincular 123456",
    );
    return;
  }

  const chatId = ctx.chat.id.toString();
  const linked = await linkTelegram(code, chatId);
  if (linked) {
    tokenCache.delete(chatId);
    await ctx.reply("¡Listo! Tu cuenta quedó vinculada.");
  } else {
    await ctx.reply(
      "El código es inválido o ya expiró. Generá uno nuevo desde la app.",
    );
  }
});

bot.command("saldo", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const token = await getTokenForChat(chatId);
  if (!token) {
    await ctx.reply(
      "Todavía no vinculaste tu cuenta. Generá un código desde la app y mandá /vincular <código>.",
    );
    return;
  }

  try {
    const res = await fetch(`${API_URL}/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`API respondió ${res.status}`);
    const data = (await res.json()) as {
      balance: number;
      totalIncome: number;
      totalExpenses: number;
    };
    await ctx.reply(
      `Saldo: $${data.balance}\nIngresos: $${data.totalIncome}\nGastos: $${data.totalExpenses}`,
    );
  } catch {
    await ctx.reply("No pude consultar el saldo. Probá de nuevo.");
  }
});

bot.on("message:text", async (ctx) => {
  if (ctx.msg.text.startsWith("/")) return;

  const chatId = ctx.chat.id.toString();
  const token = await getTokenForChat(chatId);
  if (!token) {
    await ctx.reply(
      "Todavía no vinculaste tu cuenta. Generá un código desde la app y mandá /vincular <código>.",
    );
    return;
  }

  try {
    await ensureCategories(token);
  } catch {
    await ctx.reply(
      "No pude cargar las categorías. Probá de nuevo en un momento.",
    );
    return;
  }

  if (ctx.msg.text.startsWith("+")) {
    const match = ctx.msg.text.match(/^\+(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (!match) {
      await ctx.reply('No entendí el monto. Mandá algo como "+50000 sueldo".');
      return;
    }
    const amount = parseFloat(match[1].replace(",", "."));
    const description = match[2].trim();
    try {
      await createIncome(token, amount, description);
      await ctx.reply(`Ingreso registrado: $${amount}.`);
    } catch {
      await ctx.reply("Hubo un error guardando el ingreso. Probá de nuevo.");
    }
    return;
  }

  const match = ctx.msg.text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    await ctx.reply('No entendí el monto. Mandá algo como "500 comida".');
    return;
  }

  const amount = parseFloat(match[1].replace(",", "."));
  const description = match[2].trim();
  const category = matchCategory(description);

  if (category) {
    try {
      await createExpense(token, amount, category, description);
      await ctx.reply(`Registrado: $${amount} en ${category}.`);
    } catch {
      await ctx.reply("Hubo un error guardando el gasto. Probá de nuevo.");
    }
    return;
  }

  pendingExpenses.set(chatId, { amount, description, token });
  const keyboard = Object.keys(CATEGORY_SYNONYMS).reduce(
    (kb, cat) => kb.text(cat, cat).row(),
    new InlineKeyboard(),
  );
  await ctx.reply(`¿En qué categoría entra "$${amount}"?`, {
    reply_markup: keyboard,
  });
});

bot.on("callback_query:data", async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat.id.toString();
  if (!chatId) return;

  const pending = pendingExpenses.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: "Ese gasto ya no está pendiente." });
    return;
  }

  const category = ctx.callbackQuery.data;
  try {
    await createExpense(
      pending.token,
      pending.amount,
      category,
      pending.description,
    );
    await ctx.editMessageText(`Registrado: $${pending.amount} en ${category}.`);
  } catch {
    await ctx.reply("Hubo un error guardando el gasto. Probá de nuevo.");
  } finally {
    pendingExpenses.delete(chatId);
    await ctx.answerCallbackQuery();
  }
});

bot.catch((err) => {
  console.error("Error en el bot:", err.error);
});

if (BOT_MODE === "polling") {
  bot.start();
  console.log("Bot corriendo en modo polling");
} else {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    throw new Error(
      "BOT_MODE=webhook necesita WEBHOOK_SECRET y una URL pública (WEBHOOK_URL, o RENDER_EXTERNAL_URL en Render).",
    );
  }

  await bot.init();

  const handleUpdate = webhookCallback(bot, "http", {
    secretToken: WEBHOOK_SECRET,
    onTimeout: "return",
  });

  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      handleUpdate(req, res).catch((err) => {
        console.error("Error procesando update de Telegram:", err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end();
        }
      });
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Bot escuchando webhooks en el puerto ${PORT}`);

  try {
    await bot.api.setWebhook(WEBHOOK_URL, { secret_token: WEBHOOK_SECRET });
    console.log("Webhook registrado en Telegram:", WEBHOOK_URL);
  } catch (err) {
    console.error("No se pudo registrar el webhook en Telegram:", err);
    process.exit(1);
  }
}
