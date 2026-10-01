const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_AMOUNT = 9_999_999_999.99;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isValidAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_AMOUNT
  );
}

const MONTH_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_REGEX.test(value);
}

export function isChatId(value: unknown): value is string {
  return typeof value === "string" && /^-?\d{1,20}$/.test(value);
}

export function isLinkCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}
