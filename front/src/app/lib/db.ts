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

/**
 * DDL creating `name` only if it is missing. Not `CREATE SCHEMA IF NOT
 * EXISTS`: PostgreSQL checks the right to create schemas before looking, and
 * the frontend's account has none (docker/postgres/provision.sql creates its
 * schemas for it). The CREATE is reached only on a bare database, by an
 * account allowed to run it.
 */
export function createSchemaIfMissing(name: "users" | "billing" | "ratelimit" | "erasures"): string {
  return `DO $$ BEGIN IF to_regnamespace('${name}') IS NULL THEN CREATE SCHEMA ${name}; END IF; END $$;`;
}

/**
 * A function applying `ddl` on its first call, then resolving at once. A
 * failure is not remembered: the next call tries again — a database briefly
 * unreachable at the first request would otherwise break the feature until
 * the server restarts.
 */
export function runDdlOnce(ddl: string): () => Promise<void> {
  let ready: Promise<void> | undefined;
  return () => {
    ready ??= query(ddl).then(
      () => undefined,
      (error: unknown) => {
        ready = undefined;
        throw error;
      },
    );
    return ready;
  };
}

/** Run a parameterised query and return the rows. */
export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
