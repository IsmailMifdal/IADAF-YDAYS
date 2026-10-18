/**
 * Lead repository — e-mail addresses volunteered in the welcome chat, stored in
 * the Postgres `users` schema.
 *
 * RGPD: an address is only stored with the consent that came with it (which
 * wording, when), carries its own unsubscribe token, and is erased after
 * LEAD_RETENTION_YEARS without renewed consent.
 */

import { randomBytes } from "node:crypto";

import type { PoolClient } from "pg";

import { createSchemaIfMissing, query, runDdlOnce } from "./db";

/**
 * Identifies the consent wording shown to the visitor. Bump it whenever the
 * text in LanguageContext (`chat.emailConsent`) changes, so every stored
 * consent still points at the exact wording it was given for.
 */
export const LEAD_CONSENT_VERSION = "accueil-chat-v1";

/** CNIL guidance for prospects: three years from the last contact. */
const LEAD_RETENTION_YEARS = 3;

const DDL = `
  ${createSchemaIfMissing("users")}

  CREATE TABLE IF NOT EXISTS users.lead_emails (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    source            VARCHAR(50)  NOT NULL,
    consent_version   VARCHAR(50)  NOT NULL,
    consented_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    unsubscribe_token VARCHAR(64)  NOT NULL UNIQUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
  );
`;

const ensureLeadSchema = runDdlOnce(DDL);

/**
 * Record an address with its consent. Giving consent again refreshes it, which
 * also restarts the retention period.
 */
export async function saveLead(email: string, source: string): Promise<void> {
  await ensureLeadSchema();

  // Retention is enforced here rather than by a scheduler the frontend doesn't
  // have: every new lead sweeps out the expired ones.
  await query(
    `DELETE FROM users.lead_emails
      WHERE consented_at < now() - make_interval(years => $1)`,
    [LEAD_RETENTION_YEARS],
  );

  await query(
    `INSERT INTO users.lead_emails (email, source, consent_version, unsubscribe_token)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
            SET source          = EXCLUDED.source,
                consent_version = EXCLUDED.consent_version,
                consented_at    = now()`,
    [
      email.trim().toLowerCase(),
      source,
      LEAD_CONSENT_VERSION,
      randomBytes(32).toString("hex"),
    ],
  );
}

/** Erase the lead owning this token, if any. */
export async function unsubscribeLead(token: string): Promise<void> {
  await ensureLeadSchema();
  await query(`DELETE FROM users.lead_emails WHERE unsubscribe_token = $1`, [token]);
}

/**
 * Erase every lead stored for an address, inside the caller's transaction.
 *
 * Also covers `public.lead_emails`, where the AI service used to store leads
 * without any record of consent, for databases that still hold it.
 */
export async function deleteLeadsForEmail(
  client: PoolClient,
  email: string,
): Promise<void> {
  await ensureLeadSchema();
  const normalised = email.trim().toLowerCase();

  await client.query(`DELETE FROM users.lead_emails WHERE email = $1`, [normalised]);

  const legacy = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public.lead_emails') IS NOT NULL AS exists`,
  );
  if (legacy.rows[0]?.exists) {
    // The legacy table never normalised case.
    await client.query(`DELETE FROM public.lead_emails WHERE lower(email) = $1`, [
      normalised,
    ]);
  }
}
