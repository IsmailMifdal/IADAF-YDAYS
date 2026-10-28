/** Ask for a password reset link — POST /api/auth/password-reset/request. */

import { NextResponse } from "next/server";

import { requestPasswordReset } from "../../../../lib/passwordReset";
import { RATE_LIMITS, clientIp, hitAll, tooManyRequests } from "../../../../lib/rateLimit";
import { passwordResetRequestSchema } from "../../../../lib/validation";
import { getLang, getMessages, validationMessage } from "../../../../i18n/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const m = await getMessages();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.errors.invalidBody }, { status: 400 });
  }

  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: validationMessage(m, parsed.error.issues[0]?.message) },
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
  // The language is read now, while the request is live: the e-mail goes out
  // after the response.
  void requestPasswordReset(email, await getLang()).catch((error) => {
    console.error("[password-reset] request failed", error);
  });
  // Same answer whatever happened: the endpoint must not reveal accounts.
  return NextResponse.json({ message: m.auth.forgot.genericSent });
}
