/** Lead capture from the welcome chat — POST /api/leads. */

import { NextResponse } from "next/server";

import { saveLead } from "../../lib/leads";
import { RATE_LIMITS, clientIp, hit, tooManyRequests } from "../../lib/rateLimit";
import { leadSchema } from "../../lib/validation";
import { getMessages } from "../../i18n/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const m = await getMessages();
  const limit = await hit(RATE_LIMITS.leads, clientIp(request.headers));
  if (!limit.allowed) return tooManyRequests(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.errors.invalidBody }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: m.errors.invalidData }, { status: 400 });
  }

  try {
    await saveLead(parsed.data.email, parsed.data.source);
    // Same answer whether the address was new or not: no account enumeration.
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("[leads] save failed", error);
    return NextResponse.json(
      { error: m.errors.leadSaveFailed },
      { status: 500 },
    );
  }
}
