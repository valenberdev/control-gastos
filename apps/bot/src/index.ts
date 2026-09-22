import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API_URL = process.env.API_URL || 'http://api:3000';
const API_KEY = process.env.API_KEY!;
const BOT_MODE = process.env.BOT_MODE || 'polling';

const bot = new Bot(TELEGRAM_BOT_TOKEN);

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  comida: ['comida', 'super', 'almuerzo', 'cena', 'desayuno', 'restaurante', 'delivery'],
  transporte: ['transporte', 'uber', 'colectivo', 'nafta', 'taxi', 'subte'],
  entretenimiento: ['entretenimiento', 'cine', 'streaming', 'salida', 'bar'],
  salud: ['salud', 'farmacia', 'medico', 'remedios'],
  servicios: ['servicios', 'luz', 'gas', 'internet', 'alquiler', 'celular'],
  otros: ['otros'],
};

let categoryIds: Record<string, string> = {};

async function loadCategories(retries = 10): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${API_URL}/categories`, {
        headers: { 'x-api-key': API_KEY },
      });
      if (!res.ok) throw new Error(`API respondió ${res.status}`);
      const categories = (await res.json()) as { id: string; name: string }[];
      categoryIds = Object.fromEntries(categories.map((c) => [c.name, c.id]));
      console.log('Categorías cargadas:', Object.keys(categoryIds));
      return;
    } catch {
      console.log(`API no disponible todavía, reintentando (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('No se pudo conectar a la API para cargar categorías');
}

function matchCategory(text: string): string | null {
  const words = text.toLowerCase().split(/\s+/);
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some((syn) => words.includes(syn))) return category;
  }
  return null;
}

async function createExpense(amount: number, category: string, description: string) {
  const categoryId = categoryIds[category];
  const res = await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ amount, categoryId, description, source: 'telegram' }),
  });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
}

const pendingExpenses = new Map<number, { amount: number; description: string }>();

function isAuthorized(chatId: number): boolean {
  return chatId.toString() === TELEGRAM_CHAT_ID;
}

bot.on('message:text', async (ctx) => {
  if (!isAuthorized(ctx.chat.id) || ctx.msg.text.startsWith('/')) return;

  const match = ctx.msg.text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    await ctx.reply('No entendí el monto. Mandá algo como "500 comida".');
    return;
  }

  const amount = parseFloat(match[1].replace(',', '.'));
  const description = match[2].trim();
  const category = matchCategory(description);

  if (category) {
    try {
      await createExpense(amount, category, description);
      await ctx.reply(`Registrado: $${amount} en ${category}.`);
    } catch {
      await ctx.reply('Hubo un error guardando el gasto. Probá de nuevo.');
    }
    return;
  }

  pendingExpenses.set(ctx.chat.id, { amount, description });
  const keyboard = Object.keys(CATEGORY_SYNONYMS).reduce(
    (kb, cat) => kb.text(cat, cat).row(),
    new InlineKeyboard(),
  );
  await ctx.reply(`¿En qué categoría entra "$${amount}"?`, { reply_markup: keyboard });
});

bot.on('callback_query:data', async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat.id;
  if (!chatId || !isAuthorized(chatId)) return;

  const pending = pendingExpenses.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: 'Ese gasto ya no está pendiente.' });
    return;
  }

  const category = ctx.callbackQuery.data;
  try {
    await createExpense(pending.amount, category, pending.description);
    await ctx.editMessageText(`Registrado: $${pending.amount} en ${category}.`);
  } catch {
    await ctx.reply('Hubo un error guardando el gasto. Probá de nuevo.');
  } finally {
    pendingExpenses.delete(chatId);
    await ctx.answerCallbackQuery();
  }
});

bot.catch((err) => {
  console.error('Error en el bot:', err.error);
});

loadCategories()
  .then(() => {
    if (BOT_MODE === 'polling') {
      bot.start();
      console.log('Bot corriendo en modo polling');
    } else {
      console.log('Modo webhook: pendiente, se implementa en Fase 4 junto con el servidor de producción');
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });