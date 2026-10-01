import { describe, expect, it } from "vitest";
import {
  MAX_DESCRIPTION_LENGTH,
  matchCategory,
  parseAmount,
  parseMessage,
} from "../parser/parser";

describe("parseAmount", () => {
  it.each([
    ["500", 500],
    ["  500  ", 500],
    ["0,5", 0.5],
    ["1500,50", 1500.5],
    ["1500.50", 1500.5],
    ["1.500", 1500],
    ["1.500,50", 1500.5],
    ["100.000", 100000],
    ["12.345.678", 12345678],
    ["9999999999.99", 9999999999.99],
  ])("acepta %j como %d", (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  it.each([
    "",
    "0",
    "0,00",
    "-5",
    "1,500",
    "1.5.0",
    "1.500.50",
    "1,2,3",
    "abc",
    "12abc",
    "1 500",
    "10000000000",
  ])("rechaza %j", (raw) => {
    expect(parseAmount(raw)).toBeNull();
  });
});

describe("matchCategory", () => {
  it.each([
    ["super", "comida"],
    ["supermercado", "comida"],
    ["Almuerzo con amigos", "comida"],
    ["almuerzo, con amigos", "comida"],
    ["uber", "transporte"],
    ["médico", "salud"],
    ["cine", "entretenimiento"],
    ["luz", "servicios"],
  ])("%j → %s", (text, expected) => {
    expect(matchCategory(text)).toBe(expected);
  });

  it('solo reconoce palabras completas: "barato" no es "bar"', () => {
    expect(matchCategory("barato")).toBeNull();
  });

  it("devuelve null si no reconoce nada", () => {
    expect(matchCategory("regalo para mamá")).toBeNull();
  });

  it("con dos categorías posibles gana la primera de la lista", () => {
    expect(matchCategory("uber comida")).toBe("comida");
  });
});

describe("parseMessage: gastos", () => {
  it("monto con categoría reconocida", () => {
    expect(parseMessage("500 comida")).toEqual({
      kind: "expense",
      amount: 500,
      description: "comida",
      category: "comida",
    });
  });

  it("acepta el monto pegado a la descripción", () => {
    expect(parseMessage("500comida")).toMatchObject({
      kind: "expense",
      amount: 500,
      category: "comida",
    });
  });

  it("interpreta el punto como separador de miles", () => {
    expect(parseMessage("1.500 uber al centro")).toEqual({
      kind: "expense",
      amount: 1500,
      description: "uber al centro",
      category: "transporte",
    });
  });

  it("sin categoría reconocida devuelve category null", () => {
    expect(parseMessage("250,50 regalo")).toEqual({
      kind: "expense",
      amount: 250.5,
      description: "regalo",
      category: null,
    });
  });

  it("acepta un gasto sin descripción", () => {
    expect(parseMessage("500")).toEqual({
      kind: "expense",
      amount: 500,
      description: "",
      category: null,
    });
  });

  it("ignora espacios de más y mayúsculas", () => {
    expect(parseMessage("  500   SUPER  ")).toMatchObject({
      amount: 500,
      description: "SUPER",
      category: "comida",
    });
  });

  it("acepta descripciones de varias líneas", () => {
    expect(parseMessage("500 comida\ncon amigos")).toMatchObject({
      amount: 500,
      description: "comida\ncon amigos",
      category: "comida",
    });
  });
});

describe("parseMessage: ingresos", () => {
  it("prefijo +", () => {
    expect(parseMessage("+50000 sueldo")).toEqual({
      kind: "income",
      amount: 50000,
      description: "sueldo",
    });
  });

  it("acepta un espacio después del + y miles con punto", () => {
    expect(parseMessage("+ 50.000 sueldo")).toEqual({
      kind: "income",
      amount: 50000,
      description: "sueldo",
    });
  });

  it("ingreso sin descripción", () => {
    expect(parseMessage("+1500")).toEqual({
      kind: "income",
      amount: 1500,
      description: "",
    });
  });
});

describe("parseMessage: descripciones largas", () => {
  it("recorta la descripción al tope de la API pero reconoce la categoría del texto completo", () => {
    const largo = `500 ${"x ".repeat(150)}comida`;

    const parsed = parseMessage(largo);

    expect(parsed).toMatchObject({ kind: "expense", amount: 500, category: "comida" });
    expect(parsed.kind === "expense" && parsed.description.length).toBe(MAX_DESCRIPTION_LENGTH);
  });
});

describe("parseMessage: mensajes inválidos", () => {
  it.each([
    "",
    "   ",
    "hola",
    "comida 500",
    "-500 comida",
    "+",
    "+ sueldo",
    "++500 sueldo",
    "0 comida",
    "1,500 comida",
    "500,5.5 comida",
  ])("rechaza %j", (text) => {
    expect(parseMessage(text)).toEqual({ kind: "invalid" });
  });
});
