import pg from "pg";
import type { PoolConfig } from "pg";

pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

function buildSsl(): PoolConfig["ssl"] {
  if (process.env.DATABASE_SSL !== "true") return undefined;

  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (ca) return { ca, rejectUnauthorized: true };

  console.warn(
    "DATABASE_SSL activo sin DATABASE_CA_CERT: conexión cifrada pero sin verificar el servidor.",
  );
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSsl(),
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres:", err);
});
