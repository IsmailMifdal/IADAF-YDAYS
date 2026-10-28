/** Purchase history of the signed-in account. */

import { NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { listPurchases } from "../../../lib/entitlements";
import { getPackBySlug } from "../../../(app)/packs/packsData";
import { getMessages } from "../../../i18n/server";

export const runtime = "nodejs";

export async function GET() {
  const m = await getMessages();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: m.errors.authRequired }, { status: 401 });
  }

  try {
    const rows = await listPurchases(session.user.id);

    const purchases = rows.map((row) => ({
      slug: row.pack_slug,
      // A pack removed from the catalogue must not break the history.
      title: getPackBySlug(row.pack_slug)?.title ?? row.pack_slug,
      amountCents: row.amount_cents,
      purchasedAt: row.created_at,
      reference: row.stripe_session_id,
    }));

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error("[account/purchases] lookup failed", error);
    return NextResponse.json(
      { error: m.errors.purchasesLoadFailed },
      { status: 500 },
    );
  }
}
