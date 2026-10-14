/**
 * Server-side access to the AI service, through the API gateway.
 *
 * Calls carry the shared INTERNAL_API_TOKEN so the AI service can tell them
 * apart from anyone else reaching the gateway: it only trusts an `X-User-Id`,
 * and only allows erasing data, when the token is present.
 */

export const GATEWAY_URL =
  process.env.API_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  "http://localhost:8080";

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN ?? "";

/** Headers vouching for a signed-in user, or none when the token is unset. */
export function internalHeaders(userId?: string): Record<string, string> {
  if (!INTERNAL_API_TOKEN || !userId) return {};
  return { "X-Internal-Token": INTERNAL_API_TOKEN, "X-User-Id": userId };
}

/**
 * Erase the user's conversations in the AI service. Throws if the service
 * could not confirm it, so account deletion is not reported as complete when
 * it isn't.
 */
export async function eraseAiData(userId: string): Promise<void> {
  // Without the token no conversation was ever tied to an account, so there
  // is nothing to erase.
  if (!INTERNAL_API_TOKEN) return;

  const res = await fetch(
    `${GATEWAY_URL}/api/ai/users/${encodeURIComponent(userId)}/data`,
    {
      method: "DELETE",
      headers: { "X-Internal-Token": INTERNAL_API_TOKEN },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) {
    throw new Error(`AI service erase failed with HTTP ${res.status}`);
  }
}
