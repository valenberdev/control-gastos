interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  statusCode?: number;
  constraint?: string;
  stack?: string;
}

// Describe un error sin volcarlo entero: los errores de pg traen `detail` con
// los valores de la fila (por ejemplo el email de una violación de unicidad) y
// los de web-push traen el `endpoint` de la suscripción, que funciona como
// credencial de entrega. Solo se registran el tipo, el código y el mensaje.
export function describeError(err: unknown): string {
  if (typeof err !== "object" || err === null) return String(err);

  const e = err as ErrorLike;
  const parts = [e.name ?? "Error"];
  if (e.code) parts.push(`code=${e.code}`);
  if (e.statusCode) parts.push(`status=${e.statusCode}`);
  if (e.constraint) parts.push(`constraint=${e.constraint}`);

  const frames = (e.stack ?? "")
    .split("\n")
    .filter((line) => line.trim().startsWith("at "))
    .slice(0, 3)
    .map((line) => line.trim());

  return [`${parts.join(" ")}: ${e.message ?? ""}`, ...frames].join("\n  ");
}

export function logError(err: unknown, context?: string): void {
  console.error(context ? `[${context}]` : "[error]", describeError(err));
}
