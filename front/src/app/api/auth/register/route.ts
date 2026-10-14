/** Account creation for the Credentials provider. */

import { NextResponse } from "next/server";

import { createCredentialsUser } from "../../../lib/users";
import { registerSchema } from "../../../lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  try {
    const user = await createCredentialsUser(parsed.data);

    // A null row means the ON CONFLICT clause fired — the address is taken.
    // The message stays deliberately vague so the endpoint cannot be used to
    // enumerate registered addresses.
    if (!user) {
      return NextResponse.json(
        { error: "Impossible de créer ce compte. Essayez de vous connecter." },
        { status: 409 },
      );
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    console.error("[register] account creation failed", error);
    return NextResponse.json(
      { error: "Une erreur est survenue. Réessayez plus tard." },
      { status: 500 },
    );
  }
}
