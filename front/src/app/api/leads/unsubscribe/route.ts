/**
 * Unsubscribe — POST /api/leads/unsubscribe.
 *
 * A POST rather than a link that deletes on GET: mail clients and antivirus
 * scanners open links on their own, which would unsubscribe people who never
 * clicked.
 */

import { NextResponse } from "next/server";

import { unsubscribeLead } from "../../../lib/leads";
import { unsubscribeSchema } from "../../../lib/validation";
import { getMessages } from "../../../i18n/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const m = await getMessages();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.errors.invalidBody }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: m.errors.invalidUnsubscribeLink }, { status: 400 });
  }

  try {
    // An unknown token means the address is already gone: for the visitor,
    // that is the outcome they asked for.
    await unsubscribeLead(parsed.data.token);
    return NextResponse.json({ unsubscribed: true });
  } catch (error) {
    console.error("[leads] unsubscribe failed", error);
    return NextResponse.json(
      { error: m.errors.unsubscribeFailed },
      { status: 500 },
    );
  }
}
