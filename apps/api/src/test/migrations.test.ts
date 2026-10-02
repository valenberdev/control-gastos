import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../db/pool.js";
import {
  assertSchemaUpToDate,
  missingMigrations,
  REQUIRED_MIGRATIONS,
} from "../db/schema.js";
import { closePool } from "./helpers.js";

afterAll(closePool);

const migrationsDir =
  process.env.DB_MIGRATIONS_DIR ??
  fileURLToPath(new URL("../../../../db/migrations", import.meta.url));

describe("registro de migraciones", () => {
  it.skipIf(!existsSync(migrationsDir))(
    "REQUIRED_MIGRATIONS coincide con los archivos de db/migrations",
    () => {
      const versions = readdirSync(migrationsDir)
        .filter((file) => /^\d{3}_.+\.sql$/.test(file))
        .map((file) => file.slice(0, 3))
        .sort();

      expect([...REQUIRED_MIGRATIONS]).toEqual(versions);
    },
  );

  it("una base creada con init.sql tiene todas las migraciones registradas", async () => {
    expect(await missingMigrations()).toEqual([]);
  });

  it("detecta una migración que falta", async () => {
    const { rows } = await pool.query(
      "SELECT name FROM schema_migrations WHERE version = '003'",
    );
    await pool.query("DELETE FROM schema_migrations WHERE version = '003'");
    try {
      expect(await missingMigrations()).toEqual(["003"]);
      await expect(assertSchemaUpToDate()).rejects.toThrow(/003/);
    } finally {
      await pool.query(
        "INSERT INTO schema_migrations (version, name) VALUES ('003', $1)",
        [rows[0].name],
      );
    }
  });

  it("si falta la tabla del registro, faltan todas", async () => {
    await pool.query(
      "ALTER TABLE schema_migrations RENAME TO schema_migrations_tmp",
    );
    try {
      expect(await missingMigrations()).toEqual([...REQUIRED_MIGRATIONS]);
    } finally {
      await pool.query(
        "ALTER TABLE schema_migrations_tmp RENAME TO schema_migrations",
      );
    }
  });
});
