const KEY = "cg_install_hint";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredHint {
  never?: boolean;
  snoozedUntil?: number;
}

function read(): StoredHint {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return typeof parsed === "object" && parsed !== null
      ? (parsed as StoredHint)
      : {};
  } catch {
    return {};
  }
}

function write(hint: StoredHint): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(hint));
  } catch {}
}

export function shouldShowInstallHint(now = Date.now()): boolean {
  const hint = read();
  if (hint.never === true) return false;
  return !(typeof hint.snoozedUntil === "number" && hint.snoozedUntil > now);
}

export function snoozeInstallHint(now = Date.now()): void {
  const hint = read();
  if (hint.never === true) return;
  write({ ...hint, snoozedUntil: now + SNOOZE_MS });
}

export function dismissInstallHintForever(): void {
  write({ ...read(), never: true });
}
