/**
 * Server startup hook. Next.js awaits `register` before the server handles
 * any request, so the frontend's tables exist before /api/health turns green
 * and `docker compose up --wait` returns (ISM-19). The lazy calls in each
 * module stay: they retry if the database was unreachable here.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureAuthSchema } = await import("./app/lib/users");
  const { ensureBillingSchema } = await import("./app/lib/entitlements");
  const { ensureLeadSchema } = await import("./app/lib/leads");
  const { ensureResetSchema } = await import("./app/lib/passwordReset");
  const { ensureSchema: ensureRateLimitSchema } = await import("./app/lib/rateLimit");

  // In order: later tables reference users.app_users.
  for (const ensure of [ensureAuthSchema, ensureBillingSchema, ensureLeadSchema, ensureResetSchema, ensureRateLimitSchema]) {
    await ensure();
  }
}
