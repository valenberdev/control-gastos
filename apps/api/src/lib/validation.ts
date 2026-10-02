const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_AMOUNT = 9_999_999_999.99;
export const MAX_DESCRIPTION_LENGTH = 200;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isValidAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_AMOUNT &&
    Number(value.toFixed(2)) === value
  );
}

// La descripción es opcional: undefined y null valen; si viene, es texto corto.
export function isValidDescription(
  value: unknown,
): value is string | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.length <= MAX_DESCRIPTION_LENGTH)
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

// bcrypt solo usa los primeros 72 bytes de la contraseña: más allá se ignoran.
export const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_LENGTH = 8;

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "12341234",
  "123123123",
  "987654321",
  "11111111",
  "00000000",
  "1q2w3e4r",
  "abc12345",
  "abcd1234",
  "qwerty123",
  "qwertyui",
  "qwertyuiop",
  "asdfghjk",
  "password",
  "password1",
  "password123",
  "iloveyou",
  "letmein1",
  "welcome1",
  "admin123",
  "contrasena",
  "contrasena1",
  "contrasena123",
  "argentina",
]);

// Devuelve el motivo por el que se rechaza la contraseña, o null si sirve.
export function passwordProblem(value: unknown): string | null {
  if (typeof value !== "string") return "La contraseña es obligatoria";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña es muy corta (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`;
  }
  if (Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES) {
    return `La contraseña es muy larga (máximo ${MAX_PASSWORD_BYTES} bytes)`;
  }
  if (/^(.)\1+$/u.test(value)) return "La contraseña es demasiado simple";
  const normalized = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) {
    return "Esa contraseña es muy común: elige otra";
  }
  return null;
}

// Los endpoints de push solo pueden apuntar a los servicios de notificaciones
// de los navegadores: la API hace un pedido HTTPS saliente a esa dirección.
export const MAX_PUSH_ENDPOINT_LENGTH = 2048;
export const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 10;

const PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);
const PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_PUSH_ENDPOINT_LENGTH) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.port !== "") return false;
  if (url.username !== "" || url.password !== "") return false;

  const host = url.hostname.toLowerCase();
  return (
    PUSH_HOSTS.has(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s))
  );
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function isPushKey(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === "string" &&
    value.length >= min &&
    value.length <= max &&
    BASE64URL.test(value)
  );
}
