/** Ask for a password reset link — POST /api/auth/password-reset/request. */

import { NextResponse } from "next/server";

import { requestPasswordReset } from "../../../../lib/passwordReset";
import { RATE_LIMITS, clientIp, hitAll, tooManyRequests } from "../../../../lib/rateLimit";
import { passwordResetRequestSchema } from "../../../../lib/validation";

export const runtime = "nodejs";

/** Same answer whatever happened: the endpoint must not reveal accounts. */
const GENERIC = {
  message:
    "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();

  const limit = await hitAll([
    [RATE_LIMITS.passwordResetIp, clientIp(request.headers)],
    [RATE_LIMITS.passwordResetEmail, email],
  ]);
  if (!limit.allowed) return tooManyRequests(limit);

  // Not awaited: mail is only sent when the account exists, so waiting for it
  // would make the response measurably slower for real accounts — a timing
  // leak of which addresses are registered. The standalone Node server keeps
  // running the promise after the response. Errors are logged, not surfaced,
  // for the same reason.
  void requestPasswordReset(email).catch((error) => {
    console.error("[password-reset] request failed", error);
  });
  return NextResponse.json(GENERIC);
}
