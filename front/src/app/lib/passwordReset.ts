/**
 * Self-service password reset for credentials accounts.
 *
 * - The link carries a random 256-bit token; only its SHA-256 is stored, so a
 *   database leak does not hand out working reset links.
 * - Single use and short-lived: consumed by an atomic DELETE … RETURNING,
 *   expires after RESET_TTL_MINUTES, and asking again voids earlier links.
 * - The link's origin comes from AUTH_URL, never from the request's Host
 *   header — otherwise an attacker could make us e-mail a link to their site.
 */

import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { pool, query, runDdlOnce } from "./db";
import { sendMail } from "./mailer";
import { ensureAuthSchema, findUserByEmail, forgetSessionCheck } from "./users";
import { fmt } from "../i18n";
import type { LangCode } from "../context/languages";
import { getDictionary } from "../i18n/server";

const RESET_TTL_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

const DDL = `
  CREATE TABLE IF NOT EXISTS users.password_reset_tokens (
    token_hash CHAR(64)    PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users.app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const ensureResetSchema = runDdlOnce(DDL);

async function ensureSchema(): Promise<void> {
  await ensureAuthSchema();
  await ensureResetSchema();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function publicBaseUrl(): string {
  const url = process.env.AUTH_URL;
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_URL is not configured: cannot build the reset link");
  }
  return "http://localhost:3000";
}

/**
 * E-mail a reset link if the address belongs to a credentials account.
 *
 * Does nothing otherwise — the caller answers the same way in every case, so
 * the endpoint cannot be used to find out which addresses have an account.
 */
export async function requestPasswordReset(email: string, lang: LangCode = "fr"): Promise<void> {
  await ensureSchema();

  const user = await findUserByEmail(email);
  // Google-only accounts have no password to reset.
  if (!user?.password_hash) return;

  const token = randomBytes(32).toString("hex");

  // One live link per account, and a sweep of expired ones.
  await query(
    `DELETE FROM users.password_reset_tokens
      WHERE user_id = $1 OR expires_at < now()`,
    [user.id],
  );
  await query(
    `INSERT INTO users.password_reset_tokens (token_hash, user_id, expires_at)
          VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [hashToken(token), user.id, RESET_TTL_MINUTES],
  );

  const link = `${publicBaseUrl()}/reinitialiser-mot-de-passe?token=${token}`;
  // In the language of the page the request came from.
  const { email: t } = getDictionary(lang);
  await sendMail({
    to: user.email,
    subject: t.resetSubject,
    text: [
      user.name ? fmt(t.helloName, { name: user.name }) : t.hello,
      "",
      t.resetIntro,
      fmt(t.resetValidity, { minutes: RESET_TTL_MINUTES }),
      "",
      link,
      "",
      t.resetIgnore,
      "",
      t.signature,
    ].join("\n"),
  });
}

/**
 * Set a new password from a reset token. Returns false if the token is
 * unknown, expired or already used.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  await ensureSchema();
  // Hashed before opening the transaction: bcrypt takes ~250 ms.
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // DELETE … RETURNING consumes the token atomically: two concurrent
    // submissions of the same link cannot both succeed.
    const consumed = await client.query<{ user_id: string }>(
      `DELETE FROM users.password_reset_tokens
        WHERE token_hash = $1 AND expires_at > now()
        RETURNING user_id`,
      [hashToken(token)],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return false;
    }

    // A reset is what follows a stolen password: every session open until
    // now, the thief's included, ends with it.
    await client.query(
      `UPDATE users.app_users
          SET password_hash = $2, updated_at = now(), sessions_revoked_at = now()
        WHERE id = $1`,
      [userId, passwordHash],
    );
    await client.query(`DELETE FROM users.password_reset_tokens WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");
    forgetSessionCheck(userId);
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
