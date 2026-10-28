/** Set a new password from a reset link — POST /api/auth/password-reset/confirm. */

import { NextResponse } from "next/server";

import { resetPassword } from "../../../../lib/passwordReset";
import { RATE_LIMITS, clientIp, hit, tooManyRequests } from "../../../../lib/rateLimit";
import { passwordResetConfirmSchema } from "../../../../lib/validation";
import { getMessages, validationMessage } from "../../../../i18n/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const m = await getMessages();
  const limit = await hit(RATE_LIMITS.passwordResetConfirm, clientIp(request.headers));
  if (!limit.allowed) return tooManyRequests(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.errors.invalidBody }, { status: 400 });
  }

  const parsed = passwordResetConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: validationMessage(m, parsed.error.issues[0]?.message) },
      { status: 400 },
    );
  }

  try {
    const ok = await resetPassword(parsed.data.token, parsed.data.password);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            m.errors.resetLinkExpired,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ reset: true });
  } catch (error) {
    console.error("[password-reset] confirm failed", error);
    return NextResponse.json(
      { error: m.errors.genericError },
      { status: 500 },
    );
  }
}
