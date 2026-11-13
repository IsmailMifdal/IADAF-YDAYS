/**
 * Health of the public entry point — GET /api/health, for an external uptime
 * probe and the container healthcheck. Checks that the database answers and
 * that the frontend's tables exist (ISM-19); reveals nothing else (no
 * version, no component list).
 */

import { NextResponse } from "next/server";

import { query } from "../../lib/db";
import { ensureFrontendSchema } from "../../lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // The DDL result is memoised after its first success: SELECT 1 stays the
    // live database check.
    await ensureFrontendSchema();
    await query("SELECT 1");
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
