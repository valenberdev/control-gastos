import http from "node:http";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import dotenv from "dotenv";
import { CATEGORY_SYNONYMS, parseMessage } from "./parser/parser.js";

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

let categoryIds: Record<string, string> = {};

async function ensureCategories(token: string): Promise<void> {
  if (Object.keys(categoryIds).length > 0) return;
  const res = await fetch(`${API_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status);
  const categories = (await res.json()) as { id: string; name: string }[];
  categoryIds = Object.fromEntries(categories.map((c) => [c.name, c.id]));
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

class ApiError extends Error {
  constructor(public status: number) {
    super(`API respondió ${status}`);
  }
}

// La API entrega tokens de 15 minutos atados al chat: se reutilizan 10.
const tokenCache = new Map<string, { token: string; cachedAt: number }>();
const TOKEN_TTL_MS = 10 * 60 * 1000;

// Un chat sin vincular que escribe seguido no tiene que costarle un pedido a la
// API por mensaje: se recuerda un minuto que no está vinculado.
const notLinked = new Map<string, number>();
const NOT_LINKED_TTL_MS = 60 * 1000;

function forgetChat(chatId: string): void {
  tokenCache.delete(chatId);
  notLinked.delete(chatId);
}

// Si la API rechaza el token (el chat se desvinculó o la cuenta cambió), se
// descarta el guardado y se avisa. Devuelve true si el error era ese.
async function handleRevoked(
  err: unknown,
  chatId: string,
  reply: (text: string) => Promise<unknown>,
): Promise<boolean> {
  if (!(err instanceof ApiError) || err.status !== 401) return false;
  forgetChat(chatId);
  await reply(
    "Este chat ya no está vinculado a tu cuenta. Generá un código desde la app y mandá /vincular <código>.",
  );
  return true;
}

async function getTokenForChat(chatId: string): Promise<string | null> {
  const cached = tokenCache.get(chatId);
  if (cached && Date.now() - cached.cachedAt < TOKEN_TTL_MS) {
    return cached.token;
  }
  const missUntil = notLinked.get(chatId);
  if (missUntil !== undefined && Date.now() < missUntil) return null;

  const res = await fetch(`${API_URL}/auth/telegram-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify({ chatId }),
  });
  if (res.status === 404) notLinked.set(chatId, Date.now() + NOT_LINKED_TTL_MS);
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
  if (!res.ok) throw new ApiError(res.status);
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
  if (!res.ok) throw new ApiError(res.status);
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
    forgetChat(chatId);
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
    if (!res.ok) throw new ApiError(res.status);
    const data = (await res.json()) as {
      balance: number;
      totalIncome: number;
      totalExpenses: number;
    };
    await ctx.reply(
      `Saldo: $${data.balance}\nIngresos: $${data.totalIncome}\nGastos: $${data.totalExpenses}`,
    );
  } catch (err) {
    if (await handleRevoked(err, chatId, (t) => ctx.reply(t))) return;
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

  const parsed = parseMessage(ctx.msg.text);
  if (parsed.kind === "invalid") {
    await ctx.reply(
      'No entendí el monto. Mandá algo como "500 comida", "1.500 super" o "+50000 sueldo".',
    );
    return;
  }

  if (parsed.kind === "income") {
    try {
      await createIncome(token, parsed.amount, parsed.description);
      await ctx.reply(`Ingreso registrado: $${parsed.amount}.`);
    } catch (err) {
      if (await handleRevoked(err, chatId, (t) => ctx.reply(t))) return;
      await ctx.reply("Hubo un error guardando el ingreso. Probá de nuevo.");
    }
    return;
  }

  try {
    await ensureCategories(token);
  } catch (err) {
    if (await handleRevoked(err, chatId, (t) => ctx.reply(t))) return;
    await ctx.reply(
      "No pude cargar las categorías. Probá de nuevo en un momento.",
    );
    return;
  }

  if (parsed.category) {
    try {
      await createExpense(
        token,
        parsed.amount,
        parsed.category,
        parsed.description,
      );
      await ctx.reply(`Registrado: $${parsed.amount} en ${parsed.category}.`);
    } catch (err) {
      if (await handleRevoked(err, chatId, (t) => ctx.reply(t))) return;
      await ctx.reply("Hubo un error guardando el gasto. Probá de nuevo.");
    }
    return;
  }

  pendingExpenses.set(chatId, {
    amount: parsed.amount,
    description: parsed.description,
    token,
  });
  const keyboard = Object.keys(CATEGORY_SYNONYMS).reduce(
    (kb, cat) => kb.text(cat, cat).row(),
    new InlineKeyboard(),
  );
  await ctx.reply(`¿En qué categoría entra "$${parsed.amount}"?`, {
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
  } catch (err) {
    if (!(await handleRevoked(err, chatId, (t) => ctx.reply(t)))) {
      await ctx.reply("Hubo un error guardando el gasto. Probá de nuevo.");
    }
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
