/**
 * "This pre-check result is wrong" — POST /api/precheck/disputes.
 *
 * Adds one to an anonymous count in analytics (category, check, result
 * shown): no document, no account, no free text is stored. Set against the
 * counts of checks run, it gives each check's error rate — what must be
 * known before training a model to replace the rules.
 */

import { NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { GATEWAY_URL, backendAuthHeaders } from "../../../lib/aiService";
import { RATE_LIMITS, hit, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

const CATEGORIES = new Set(["identity", "address", "bank", "other"]);
// "unknown" is shown without a verdict: there is nothing to contest.
const STATUSES = new Set(["ok", "warning", "error"]);
const CHECK_ID = /^[a-z_]{1,30}$/;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const limit = await hit(RATE_LIMITS.precheckDispute, userId);
  if (!limit.allowed) return tooManyRequests(limit);

  let body: { category?: unknown; checkId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const { category, checkId, status } = body;
  if (
    typeof category !== "string" || !CATEGORIES.has(category) ||
    typeof checkId !== "string" || !CHECK_ID.test(checkId) ||
    typeof status !== "string" || !STATUSES.has(status)
  ) {
    return NextResponse.json({ error: "Signalement invalide." }, { status: 400 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/api/analytics/document-checks/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await backendAuthHeaders(userId)) },
      body: JSON.stringify({ category, id: checkId, status }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`analytics answered HTTP ${res.status}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[precheck] dispute not recorded", error);
    return NextResponse.json({ error: "Signalement non enregistré." }, { status: 502 });
  }
}
