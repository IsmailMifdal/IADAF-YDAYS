/** Profile of the signed-in account: read, rename, delete. */

import { NextResponse } from "next/server";

import { auth } from "../../../auth";
import { deleteAccount, getAccount, updateAccountName } from "../../lib/users";
import { deleteAccountSchema, updateProfileSchema } from "../../lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const account = await getAccount(session.user.id);
    if (!account) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      id: account.id,
      email: account.email,
      name: account.name,
      image: account.image,
      provider: account.provider,
      createdAt: account.created_at,
      hasPassword: account.has_password,
    });
  } catch (error) {
    console.error("[account] lookup failed", error);
    return NextResponse.json(
      { error: "Impossible de charger votre profil." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  try {
    await updateAccountName(session.user.id, parsed.data.name);
    return NextResponse.json({ name: parsed.data.name });
  } catch (error) {
    console.error("[account] rename failed", error);
    return NextResponse.json(
      { error: "Impossible d’enregistrer les modifications." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  // Retyping the address is the safeguard against an accidental click; it must
  // match the account actually signed in.
  if (
    parsed.data.confirmEmail.toLowerCase() !== session.user.email?.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "L’adresse saisie ne correspond pas à votre compte." },
      { status: 400 },
    );
  }

  try {
    await deleteAccount(session.user.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[account] deletion failed", error);
    // The account row goes last (see deleteAccount), so retrying is safe.
    return NextResponse.json(
      { error: "Impossible de supprimer le compte pour le moment. Réessayez dans un instant." },
      { status: 500 },
    );
  }
}
