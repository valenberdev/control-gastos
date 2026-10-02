import { pool } from "./pool.js";

export const REQUIRED_MIGRATIONS = ["001", "002", "003", "004", "005"] as const;

export async function missingMigrations(): Promise<string[]> {
  let applied: Set<string>;
  try {
    const result = await pool.query<{ version: string }>(
      "SELECT version FROM schema_migrations",
    );
    applied = new Set(result.rows.map((row) => row.version));
  } catch (err) {
    if ((err as { code?: string }).code === "42P01")
      return [...REQUIRED_MIGRATIONS];
    throw err;
  }
  return REQUIRED_MIGRATIONS.filter((version) => !applied.has(version));
}

export async function assertSchemaUpToDate(): Promise<void> {
  const missing = await missingMigrations();
  if (missing.length > 0) {
    throw new Error(
      `A la base le faltan las migraciones ${missing.join(", ")}. Aplicalas antes de desplegar (ver docs/deployment.md).`,
    );
  }
}
