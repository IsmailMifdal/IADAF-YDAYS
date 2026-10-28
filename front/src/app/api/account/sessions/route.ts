/**
 * "Sign out everywhere" — DELETE /api/account/sessions.
 *
 * Every session of the account ends, this one included: sessions are signed
 * tokens, and the server refuses those opened before this instant
 * (sessionIsValid, checked on every request).
 */

import { NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { revokeSessions } from "../../../lib/users";
import { getMessages } from "../../../i18n/server";

export const runtime = "nodejs";

export async function DELETE() {
  const m = await getMessages();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: m.errors.authRequired }, { status: 401 });
  }
  try {
    await revokeSessions(session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[account/sessions] revocation failed", error);
    return NextResponse.json({ error: m.errors.sessionsCloseFailed }, { status: 500 });
  }
}
