import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { GATEWAY_URL, internalHeaders } from "../../../lib/aiService";

export const runtime = "nodejs";

/**
 * Request headers passed on to the AI service. Anything else — cookies (the
 * session token above all), or an `X-User-Id` / `X-Internal-Token` a client
 * tried to forge — stays here.
 */
const FORWARDED_HEADERS = ["content-type", "accept", "accept-language"];

/**
 * AI endpoints the browser may reach. Everything else is internal: the
 * erasure endpoint in particular must never be reachable through here, since
 * this proxy attaches the internal token for any signed-in user.
 */
const PUBLIC_PATHS = new Set(["chat", "translate", "analyze-document", "health"]);

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (path.length !== 1 || !PUBLIC_PATHS.has(path[0])) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const target = `${GATEWAY_URL}/api/ai/${path.join("/")}`;

  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  // Ties conversations to the account, so deleting it can erase them.
  const session = await auth();
  Object.assign(headers, internalHeaders(session?.user?.id));

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(target, init);

  return new NextResponse(res.body, {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
