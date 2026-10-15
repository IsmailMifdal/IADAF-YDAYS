import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { GATEWAY_URL, backendAuthHeaders } from "../../../lib/aiService";
import { RATE_LIMITS, clientIp, hitAll, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

/**
 * Request headers passed on to the AI service. Anything else — cookies (the
 * session token above all), or an `Authorization` / `X-User-Id` a client
 * tried to forge — stays here.
 */
const FORWARDED_HEADERS = ["content-type", "accept", "accept-language"];

/**
 * AI endpoints the browser may reach. Everything else is internal: the
 * erasure endpoint in particular must never be reachable through here, since
 * this proxy signs a token for any signed-in user.
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
  const session = await auth();
  const userId = session?.user?.id;

  // Every call but the health check costs an LLM request.
  if (path[0] !== "health") {
    const limit = await hitAll(
      userId
        ? [[RATE_LIMITS.aiUser, userId]]
        : [
            [RATE_LIMITS.aiAnonymous, clientIp(req.headers)],
            [RATE_LIMITS.aiAnonymousGlobal, "all"],
          ],
    );
    if (!limit.allowed) return tooManyRequests(limit);
  }

  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  // Signed for every call, anonymous ones included: the gateway rejects
  // anything without it. The subject ties conversations to the account, so
  // deleting it can erase them.
  Object.assign(headers, await backendAuthHeaders(userId));

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
