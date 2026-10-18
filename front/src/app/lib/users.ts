/**
 * User repository — authentication accounts stored in the Postgres `users` schema.
 *
 * Credentials accounts carry a bcrypt `password_hash`; OAuth accounts leave it NULL
 * and are identified by their `provider`.
 */

import bcrypt from "bcryptjs";

import { eraseAiData } from "./aiService";
import { eraseDemarchesData } from "./demarches";
import { eraseDocumentsData } from "./documents";
import { createSchemaIfMissing, pool, query, runDdlOnce } from "./db";
import { deleteLeadsForEmail } from "./leads";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  password_hash: string | null;
};

export type PublicUser = Pick<AppUser, "id" | "email" | "name" | "image">;

const BCRYPT_ROUNDS = 12;

// ── Schema bootstrap ──────────────────────────────────────────────────────
//
// The docker-entrypoint init scripts only run against an empty data directory,
// so an existing database would never pick up new tables. Applying the DDL
// idempotently on first use keeps both cases working.

const DDL = `
  ${createSchemaIfMissing("users")}

  CREATE TABLE IF NOT EXISTS users.app_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    name          VARCHAR(255),
    password_hash TEXT,
    image         TEXT,
    provider      VARCHAR(50) NOT NULL DEFAULT 'credentials',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Sessions are signed tokens, valid for 7 days on their own: those opened
  -- before this instant are refused (password reset or change, "sign out
  -- everywhere").
  ALTER TABLE users.app_users ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ;

  ${createSchemaIfMissing("erasures")}

  -- Accounts erased, by id alone (nothing else is left of them): restoring
  -- a backup brings them back, and deploy/replay-erasures.sh erases them
  -- again from this list (DEPLOYMENT.md, step 9).
  CREATE TABLE IF NOT EXISTS erasures.journal (
    user_id   UUID PRIMARY KEY,
    erased_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

/**
 * How long an erased account stays in the journal: longer than any backup is
 * kept (BACKUP_RETENTION_DAYS, 14), after which no backup can bring it back.
 */
const ERASURE_JOURNAL_DAYS = 30;

export const ensureAuthSchema = runDdlOnce(DDL);

// ── Queries ───────────────────────────────────────────────────────────────

/** Normalise an address so lookups are case-insensitive. */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  await ensureAuthSchema();
  const rows = await query<AppUser>(
    `SELECT id, email, name, image, provider, password_hash
       FROM users.app_users
      WHERE email = $1`,
    [normaliseEmail(email)],
  );
  return rows[0] ?? null;
}

/**
 * Create a credentials account.
 * Returns null when the address is already taken.
 */
export async function createCredentialsUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<PublicUser | null> {
  await ensureAuthSchema();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const rows = await query<PublicUser>(
    `INSERT INTO users.app_users (email, name, password_hash, provider)
          VALUES ($1, $2, $3, 'credentials')
     ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, image`,
    [normaliseEmail(input.email), input.name.trim(), passwordHash],
  );

  return rows[0] ?? null;
}

/** Verify a plaintext password against a stored account. */
export async function verifyPassword(
  user: AppUser,
  password: string,
): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

// ── Account management ────────────────────────────────────────────────────

export type AccountProfile = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  created_at: string;
  /** False for OAuth-only accounts — they have no password to change. */
  has_password: boolean;
};

export async function getAccount(userId: string): Promise<AccountProfile | null> {
  await ensureAuthSchema();
  const rows = await query<AccountProfile>(
    `SELECT id, email, name, image, provider, created_at,
            (password_hash IS NOT NULL) AS has_password
       FROM users.app_users
      WHERE id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function updateAccountName(
  userId: string,
  name: string,
): Promise<void> {
  await ensureAuthSchema();
  await query(
    `UPDATE users.app_users
        SET name = $2, updated_at = now()
      WHERE id = $1`,
    [userId, name.trim()],
  );
}

export type PasswordChangeResult =
  | "ok"
  | "wrong-current-password"
  | "no-password-set"
  | "user-not-found";

/**
 * Replace a password after verifying the current one.
 *
 * OAuth-only accounts are rejected explicitly rather than silently accepting a
 * blank current password.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  await ensureAuthSchema();

  const rows = await query<{ password_hash: string | null }>(
    `SELECT password_hash FROM users.app_users WHERE id = $1`,
    [userId],
  );
  const record = rows[0];
  if (!record) return "user-not-found";
  if (!record.password_hash) return "no-password-set";

  const valid = await bcrypt.compare(currentPassword, record.password_hash);
  if (!valid) return "wrong-current-password";

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  // Every session ends, this one included: a password is changed because it
  // may be known to someone else, whose session must not outlive it.
  await query(
    `UPDATE users.app_users
        SET password_hash = $2, updated_at = now(), sessions_revoked_at = now()
      WHERE id = $1`,
    [userId, hash],
  );
  forgetSessionCheck(userId);
  return "ok";
}

/** Ends every session of the account, on every device ("sign out everywhere"). */
export async function revokeSessions(userId: string): Promise<void> {
  await ensureAuthSchema();
  await query(`UPDATE users.app_users SET sessions_revoked_at = now() WHERE id = $1`, [userId]);
  forgetSessionCheck(userId);
}

// ── Session validity ──────────────────────────────────────────────────────
//
// Consulted on every request (src/auth.ts, jwt callback): cached briefly per
// account, and forgotten as soon as this server revokes or erases.

// Short: the middleware is bundled apart, with a cache of its own that a
// revocation made by a route cannot clear — it lags by this much at most.
const SESSION_CHECK_TTL_MS = 5_000;
const sessionChecks = new Map<string, { revokedAt: number | null; exists: boolean; at: number }>();

export function forgetSessionCheck(userId: string): void {
  sessionChecks.delete(userId);
}

/**
 * Whether a session opened at `signedInAt` (ms) may still be used: the
 * account exists, and its sessions were not revoked since.
 */
export async function sessionIsValid(userId: string, signedInAt: number): Promise<boolean> {
  let check = sessionChecks.get(userId);
  if (!check || Date.now() - check.at > SESSION_CHECK_TTL_MS) {
    await ensureAuthSchema();
    const rows = await query<{ revoked_at: number | null }>(
      `SELECT (extract(epoch FROM sessions_revoked_at) * 1000)::float8 AS revoked_at
         FROM users.app_users WHERE id = $1`,
      [userId],
    );
    check = { exists: rows.length > 0, revokedAt: rows[0]?.revoked_at ?? null, at: Date.now() };
    if (sessionChecks.size > 10_000) sessionChecks.clear();
    sessionChecks.set(userId, check);
  }
  return check.exists && (check.revokedAt === null || signedInAt > check.revokedAt);
}

/**
 * Erase an account and every personal datum tied to it (RGPD, art. 17):
 * AI conversations, démarches, filed documents, e-mail leads for its address, and the account
 * itself — pack entitlements go with it via ON DELETE CASCADE. The sales
 * ledger (billing.sales) holds no identity and is kept for accounting.
 *
 * Back-end data is erased first: if a service fails, the account still exists
 * and the user can retry, instead of being told their data is gone when it
 * isn't. Both erasures are idempotent, so a retry is safe.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await ensureAuthSchema();
  await Promise.all([
    eraseAiData(userId),
    eraseDemarchesData(userId),
    eraseDocumentsData(userId),
  ]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rows = await client.query<{ email: string }>(
      `DELETE FROM users.app_users WHERE id = $1 RETURNING email`,
      [userId],
    );
    const email = rows.rows[0]?.email;
    if (email) await deleteLeadsForEmail(client, email);
    // Same transaction: an account deleted is an account journaled.
    await client.query(
      `INSERT INTO erasures.journal (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET erased_at = now()`,
      [userId],
    );
    await client.query(
      `DELETE FROM erasures.journal WHERE erased_at < now() - make_interval(days => $1)`,
      [ERASURE_JOURNAL_DAYS],
    );
    await client.query("COMMIT");
    forgetSessionCheck(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create or refresh the local record backing an OAuth sign-in.
 * Existing credentials accounts keep their password — signing in with Google
 * on the same address simply links to the record already there.
 */
export async function upsertOAuthUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
}): Promise<PublicUser> {
  await ensureAuthSchema();
  const rows = await query<PublicUser>(
    `INSERT INTO users.app_users (email, name, image, provider)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
            SET name       = COALESCE(EXCLUDED.name, users.app_users.name),
                image      = COALESCE(EXCLUDED.image, users.app_users.image),
                updated_at = now()
       RETURNING id, email, name, image`,
    [
      normaliseEmail(input.email),
      input.name ?? null,
      input.image ?? null,
      input.provider,
    ],
  );
  return rows[0];
}
