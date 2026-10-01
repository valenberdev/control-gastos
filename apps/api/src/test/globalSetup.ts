import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("Falta TEST_DATABASE_URL (la base de prueba).");
  }

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Por seguridad, los tests solo corren contra bases cuyo nombre termina en "_test" (recibí "${dbName}").`,
    );
  }

  const initSqlPath =
    process.env.DB_INIT_SQL ??
    fileURLToPath(new URL("../../../../db/init.sql", import.meta.url));
  const initSql = readFileSync(initSqlPath, "utf8");

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await client.query(initSql);
  } finally {
    await client.end();
  }
}
