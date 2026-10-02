import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../db/pool.js";
import { forgetUser } from "../middleware/requireAuth.js";
import { api, auth, closePool, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
afterAll(closePool);

describe("requireAuth: versión de sesión", () => {
  it("pedidos simultáneos con la caché vacía hacen una sola consulta", async () => {
    const user = await createUser();
    forgetUser(user.id);
    const spy = vi.spyOn(pool, "query");

    const responses = await Promise.all(
      ["/balance", "/categories", "/reports/trend", "/balance"].map((path) =>
        api.get(path).set(auth(user)),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    const lookups = spy.mock.calls.filter(([sql]) =>
      String(sql).includes("SELECT token_version"),
    );
    expect(lookups).toHaveLength(1);
  });
});
