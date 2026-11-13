/**
 * Every table the frontend owns, created in one call — at server startup
 * (src/instrumentation.ts) and by /api/health, so a healthy frontend means
 * the tables exist (ISM-19). A new `runDdlOnce` module is added here.
 */

import { ensureBillingSchema } from "./entitlements";
import { ensureLeadSchema } from "./leads";
import { ensureResetSchema } from "./passwordReset";
import { ensureRateLimitSchema } from "./rateLimit";
import { ensureAuthSchema } from "./users";

// In order: the billing and reset tables reference users.app_users.
const ENSURE_IN_ORDER = [ensureAuthSchema, ensureBillingSchema, ensureLeadSchema, ensureResetSchema, ensureRateLimitSchema];

export async function ensureFrontendSchema(): Promise<void> {
  for (const ensure of ENSURE_IN_ORDER) {
    await ensure();
  }
}
