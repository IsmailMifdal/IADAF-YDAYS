/** Packs the signed-in user has paid for. */

import { NextResponse } from "next/server";

import { auth } from "../../../auth";
import { listUnlockedPacks } from "../../lib/entitlements";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  // Anonymous visitors simply own nothing — not an error worth surfacing.
  if (!session?.user?.id) {
    return NextResponse.json({ unlocked: [] });
  }

  try {
    const unlocked = await listUnlockedPacks(session.user.id);
    return NextResponse.json({ unlocked });
  } catch (error) {
    console.error("[entitlements] lookup failed", error);
    return NextResponse.json(
      { error: "Impossible de récupérer vos accès." },
      { status: 500 },
    );
  }
}
