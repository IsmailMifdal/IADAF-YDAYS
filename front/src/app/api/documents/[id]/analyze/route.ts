/**
 * Automated pre-check of a filed document — POST /api/documents/{id}/analyze.
 *
 * ai-service fetches the document itself from document-service, with a token
 * for this user: ownership is enforced there, and no file goes through here.
 */

import { NextResponse } from "next/server";

import { auth } from "../../../../../auth";
import { GATEWAY_URL, backendAuthHeaders } from "../../../../lib/aiService";
import { RATE_LIMITS, hit, tooManyRequests } from "../../../../lib/rateLimit";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });

  const limit = await hit(RATE_LIMITS.documentAnalysis, userId);
  if (!limit.allowed) return tooManyRequests(limit);

  let documentType: unknown;
  try {
    ({ documentType } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  if (typeof documentType !== "string" || !documentType || documentType.length > 200) {
    return NextResponse.json({ error: "Type de pièce invalide." }, { status: 400 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/api/ai/documents/${id}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await backendAuthHeaders(userId)) },
      body: JSON.stringify({ documentType }),
      signal: AbortSignal.timeout(90_000),
    });
    if (res.status === 503) {
      return NextResponse.json(
        { error: "La vérification automatique des pièces n’est pas encore ouverte." },
        { status: 503 },
      );
    }
    if (res.status === 404) return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
    if (!res.ok) return NextResponse.json({ error: "La vérification a échoué." }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("[documents] analysis failed", error);
    return NextResponse.json({ error: "La vérification a échoué." }, { status: 502 });
  }
}
