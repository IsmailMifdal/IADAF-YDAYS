/**
 * Server-side access to the backend, through the API gateway.
 *
 * Every call carries a short-lived internal JWT signed with
 * INTERNAL_JWT_SECRET. The gateway rejects any call without one, so the
 * backend is only reachable through this frontend — and its rate limiting.
 * The gateway and each service verify the token again (defence in depth) and
 * take the user's identity from its `sub` claim, never from a header.
 */

import { SignJWT } from "jose";

export const GATEWAY_URL =
  process.env.API_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  "http://localhost:8080";

/** Must match the gateway's and the services' expectations. */
const ISSUER = "iadaf-frontend";
const AUDIENCE = "iadaf-backend";
/** Long enough for one request and its fan-out (analytics), no longer. */
const TOKEN_TTL_SECONDS = 60;

let signingKey: Uint8Array | undefined;

function key(): Uint8Array {
  if (!signingKey) {
    const secret = process.env.INTERNAL_JWT_SECRET ?? "";
    // HS256 needs 256 bits; the backend refuses to start with less anyway.
    if (Buffer.byteLength(secret, "utf8") < 32) {
      throw new Error("INTERNAL_JWT_SECRET is missing or shorter than 32 bytes");
    }
    signingKey = new TextEncoder().encode(secret);
  }
  return signingKey;
}

/**
 * `Authorization` header for one backend call.
 *
 * @param userId the signed-in user, or undefined for an anonymous visitor
 * @param scope  extra right, e.g. "account:erase" — never granted to a call
 *               relayed from the browser
 */
export async function backendAuthHeaders(
  userId?: string,
  scope?: string,
): Promise<Record<string, string>> {
  const jwt = new SignJWT(scope ? { scope } : {})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`);
  if (userId) jwt.setSubject(userId);

  return { Authorization: `Bearer ${await jwt.sign(key())}` };
}

/**
 * Erase the user's conversations in the AI service. Throws if the service
 * could not confirm it, so account deletion is not reported as complete when
 * it isn't.
 */
export async function eraseAiData(userId: string): Promise<void> {
  const res = await fetch(
    `${GATEWAY_URL}/api/ai/users/${encodeURIComponent(userId)}/data`,
    {
      method: "DELETE",
      headers: await backendAuthHeaders(userId, "account:erase"),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) {
    throw new Error(`AI service erase failed with HTTP ${res.status}`);
  }
}
