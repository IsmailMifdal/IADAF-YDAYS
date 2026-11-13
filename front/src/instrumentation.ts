/**
 * Server startup hook: creates the frontend's tables before the first request
 * (ISM-19). It never throws: Next.js keeps a failed `register` for the life
 * of the process and answers 500 everywhere. On failure, /api/health stays
 * 503 and retries the DDL until it succeeds.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureFrontendSchema } = await import("./app/lib/schema");
  try {
    await ensureFrontendSchema();
  } catch (error) {
    console.error("[schema] startup DDL failed; /api/health retries it", error);
  }
}
