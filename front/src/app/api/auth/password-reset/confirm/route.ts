/** Set a new password from a reset link — POST /api/auth/password-reset/confirm. */

import { NextResponse } from "next/server";

import { resetPassword } from "../../../../lib/passwordReset";
import { RATE_LIMITS, clientIp, hit, tooManyRequests } from "../../../../lib/rateLimit";
import { passwordResetConfirmSchema } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await hit(RATE_LIMITS.passwordResetConfirm, clientIp(request.headers));
  if (!limit.allowed) return tooManyRequests(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = passwordResetConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  try {
    const ok = await resetPassword(parsed.data.token, parsed.data.password);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis la page de connexion.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ reset: true });
  } catch (error) {
    console.error("[password-reset] confirm failed", error);
    return NextResponse.json(
      { error: "Une erreur est survenue. Réessayez plus tard." },
      { status: 500 },
    );
  }
}
