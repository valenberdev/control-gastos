export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  comida: [
    "comida",
    "super",
    "supermercado",
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

const MAX_AMOUNT = 9_999_999_999.99;

export type ParsedMessage =
  | { kind: "income"; amount: number; description: string }
  | {
      kind: "expense";
      amount: number;
      description: string;
      category: string | null;
    }
  | { kind: "invalid" };

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function matchCategory(text: string): string | null {
  const words = normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some((synonym) => words.includes(synonym))) return category;
  }
  return null;
}

export function parseAmount(raw: string): number | null {
  const text = raw.trim();
  let normalized: string;

  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+([.,]\d{1,2})?$/.test(text)) {
    normalized = text.replace(",", ".");
  } else {
    return null;
  }

  const value = Number(normalized);
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}

export function parseMessage(text: string): ParsedMessage {
  const trimmed = text.trim();
  const isIncome = trimmed.startsWith("+");
  const body = isIncome ? trimmed.slice(1).trimStart() : trimmed;

  const match = body.match(/^(\d[\d.,]*)\s*([\s\S]*)$/);
  if (!match) return { kind: "invalid" };

  const amount = parseAmount(match[1]);
  if (amount === null) return { kind: "invalid" };

  const description = match[2].trim();
  if (isIncome) return { kind: "income", amount, description };
  return {
    kind: "expense",
    amount,
    description,
    category: matchCategory(description),
  };
}
