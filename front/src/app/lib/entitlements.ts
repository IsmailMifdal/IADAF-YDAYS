/**
 * Pack entitlements — which packs a user has actually paid for.
 *
 * Rows are only ever written by the Stripe webhook, once a checkout session is
 * confirmed as paid. Nothing on the client can grant access.
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
  stripeSessionId: string;
}): Promise<void> {
  await ensureBillingSchema();

  await query(
    `INSERT INTO users.pack_entitlements
            (user_id, pack_slug, amount_cents, stripe_session_id)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [input.userId, input.packSlug, input.amountCents, input.stripeSessionId],
  );
}
