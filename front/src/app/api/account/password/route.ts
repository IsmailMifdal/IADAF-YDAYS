/** Password change for credentials accounts. */

import { NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { RATE_LIMITS, hit, tooManyRequests } from "../../../lib/rateLimit";
import { changePassword } from "../../../lib/users";
import { changePasswordSchema } from "../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  // Guessing the current password from a hijacked session.
  const limit = await hit(RATE_LIMITS.passwordChange, session.user.id);
  if (!limit.allowed) return tooManyRequests(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  try {
    const result = await changePassword(
      session.user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    switch (result) {
      case "ok":
        return NextResponse.json({ changed: true });
      case "wrong-current-password":
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect." },
          { status: 400 },
        );
      case "no-password-set":
        return NextResponse.json(
          {
            error:
              "Ce compte se connecte via un fournisseur externe et n’a pas de mot de passe.",
          },
          { status: 400 },
        );
      case "user-not-found":
        return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
  } catch (error) {
    console.error("[account/password] change failed", error);
    return NextResponse.json(
      { error: "Impossible de modifier le mot de passe." },
      { status: 500 },
    );
  }
}
