import { NextRequest, NextResponse } from "next/server";

const GATEWAY =
  process.env.API_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  "http://localhost:8080";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const target = `${GATEWAY}/api/ai/${path.join("/")}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (!["host", "connection", "transfer-encoding"].includes(k.toLowerCase())) {
      headers[k] = v;
    }
  });

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
