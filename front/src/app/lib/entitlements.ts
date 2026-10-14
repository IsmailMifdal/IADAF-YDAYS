/**
 * Pack entitlements — which packs a user has actually paid for.
 *
 * Rows are only ever written by the Stripe webhook, once a checkout session is
 * confirmed as paid. Nothing on the client can grant access.
 *
 * Two tables, two lifetimes:
 * - `users.pack_entitlements` — access rights, tied to the account and erased
 *   with it (RGPD, art. 17);
 * - `billing.sales` — the sales ledger, which holds no personal data and
 *   outlives the account: accounting records must be kept ten years
 *   (art. L123-22 du Code de commerce).
 */

import { ALL_ACCESS_SLUG, packs } from "../(app)/packs/packsData";
import { query } from "./db";

// Réexporté pour ne pas casser les imports existants ; la définition vit
// désormais dans le catalogue.
export { ALL_ACCESS_SLUG };

export type Entitlement = {
  pack_slug: string;
  amount_cents: number;
  created_at: Date;
};

// ── Schema bootstrap ──────────────────────────────────────────────────────

/** Legal retention of accounting records, after which the ledger is swept. */
const SALES_RETENTION_YEARS = 10;

const DDL = `
  CREATE TABLE IF NOT EXISTS users.pack_entitlements (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users.app_users(id) ON DELETE CASCADE,
    pack_slug          VARCHAR(64) NOT NULL,
    amount_cents       INTEGER NOT NULL,
    stripe_session_id  VARCHAR(255) UNIQUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_pack UNIQUE (user_id, pack_slug)
  );

  CREATE SCHEMA IF NOT EXISTS billing;

  CREATE TABLE IF NOT EXISTS billing.sales (
    -- Links back to Stripe, which holds the customer details; nothing here
    -- identifies the buyer on its own.
    stripe_session_id  VARCHAR(255) PRIMARY KEY,
    pack_slug          VARCHAR(64)  NOT NULL,
    amount_cents       INTEGER      NOT NULL,
    currency           CHAR(3)      NOT NULL DEFAULT 'eur',
    paid_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  -- Purchases recorded before the ledger existed.
  INSERT INTO billing.sales (stripe_session_id, pack_slug, amount_cents, paid_at)
       SELECT stripe_session_id, pack_slug, amount_cents, created_at
         FROM users.pack_entitlements
        WHERE stripe_session_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  DELETE FROM billing.sales WHERE paid_at < now() - interval '${SALES_RETENTION_YEARS} years';
`;

let schemaReady: Promise<void> | undefined;

export function ensureBillingSchema(): Promise<void> {
  schemaReady ??= query(DDL).then(() => undefined);
  return schemaReady;
}

// ── Reads ─────────────────────────────────────────────────────────────────

/**
 * Every pack slug the user can open.
 * Owning the all-access pack expands to the full catalogue.
 */
export async function listUnlockedPacks(userId: string): Promise<string[]> {
  await ensureBillingSchema();

  const rows = await query<{ pack_slug: string }>(
    `SELECT pack_slug FROM users.pack_entitlements WHERE user_id = $1`,
    [userId],
  );

  const owned = new Set(rows.map((row) => row.pack_slug));
  if (owned.has(ALL_ACCESS_SLUG)) {
    return packs.map((pack) => pack.slug);
  }
  return [...owned];
}

export type Purchase = {
  pack_slug: string;
  amount_cents: number;
  stripe_session_id: string | null;
  created_at: string;
};

/**
 * Actual purchase records — one row per payment.
 *
 * Distinct from `listUnlockedPacks`, which expands the all-access pack into the
 * whole catalogue. Here we show what was really bought.
 */
export async function listPurchases(userId: string): Promise<Purchase[]> {
  await ensureBillingSchema();
  return query<Purchase>(
    `SELECT pack_slug, amount_cents, stripe_session_id, created_at
       FROM users.pack_entitlements
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId],
  );
}

export async function hasPackAccess(
  userId: string,
  packSlug: string,
): Promise<boolean> {
  await ensureBillingSchema();

  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM users.pack_entitlements
        WHERE user_id = $1 AND pack_slug IN ($2, $3)
     ) AS exists`,
    [userId, packSlug, ALL_ACCESS_SLUG],
  );

  return rows[0]?.exists ?? false;
}

// ── Writes ────────────────────────────────────────────────────────────────

/**
 * Record a paid pack.
 *
 * Stripe retries webhooks until they succeed and can deliver the same event
 * more than once, so this has to be idempotent on both the session id and the
 * (user, pack) pair.
 */
export async function grantPackAccess(input: {
  userId: string;
  packSlug: string;
  amountCents: number;
  currency: string;
  stripeSessionId: string;
}): Promise<void> {
  await ensureBillingSchema();

  // The sale first and on its own: it must be recorded even if granting the
  // access fails (an account deleted between payment and webhook, say).
  await query(
    `INSERT INTO billing.sales (stripe_session_id, pack_slug, amount_cents, currency)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [input.stripeSessionId, input.packSlug, input.amountCents, input.currency],
  );

  await query(
    `INSERT INTO users.pack_entitlements
            (user_id, pack_slug, amount_cents, stripe_session_id)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [input.userId, input.packSlug, input.amountCents, input.stripeSessionId],
  );
}
