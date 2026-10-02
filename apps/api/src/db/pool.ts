import pg from "pg";
import type { PoolConfig } from "pg";
import {
  SERVER_TIMING_ENABLED,
  recordConnect,
  recordQuery,
} from "../lib/serverTiming.js";

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
  // Con el valor por defecto (10 s) cada ráfaga de pedidos separada por más de 10 s
  // abre conexiones nuevas (TCP + TLS + autenticación contra Supabase). El
  // dashboard refresca cada 20 s, así que reconectaba en todos los ciclos.
  idleTimeoutMillis: 120_000,
  // Evita que un NAT o el pooler corten en silencio las conexiones ociosas.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  // Renueva las conexiones de vez en cuando por si el pooler las recicla.
  maxLifetimeSeconds: 30 * 60,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres:", err);
});

pool.on("connect", recordConnect);

if (SERVER_TIMING_ENABLED) {
  const query = pool.query.bind(pool) as (...args: unknown[]) => unknown;
  (pool as unknown as { query: unknown }).query = (...args: unknown[]) => {
    const start = performance.now();
    const result = query(...args);
    if (result instanceof Promise) {
      return result.finally(() => recordQuery(performance.now() - start));
    }
    return result;
  };
}
