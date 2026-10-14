/**
 * PostgreSQL connection pool shared across the Next.js server runtime.
 *
 * In development Next.js reloads modules on every change, which would leak a new
 * pool each time — so the pool is cached on globalThis.
 */

import { Pool } from "pg";

const CONNECTION_STRING =
  process.env.DATABASE_URL ??
  "postgresql://iadaf_user:iadaf_password@localhost:5432/iadaf_db";

declare global {
  var __iadafPgPool: Pool | undefined;
}

export const pool =
  globalThis.__iadafPgPool ??
  new Pool({
    connectionString: CONNECTION_STRING,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__iadafPgPool = pool;
}

/** Run a parameterised query and return the rows. */
export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
