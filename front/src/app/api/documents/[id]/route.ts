/**
 * One filed document — GET downloads it, DELETE removes it.
 *
 * Ownership is enforced by document-service from the internal token: another
 * user's id answers 404, exactly like an id that does not exist.
 */

import { NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { markPackStep } from "../../../lib/demarches";
import { deleteDocument, downloadDocument } from "../../../lib/documents";
import { getMessages } from "../../../i18n/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

async function userAndId(params: Params["params"]) {
  const session = await auth();
  const { id } = await params;
  return { userId: session?.user?.id, id: UUID.test(id) ? id : null };
}

export async function GET(_request: Request, { params }: Params) {
  const m = await getMessages();
  const { userId, id } = await userAndId(params);
  if (!userId) return NextResponse.json({ error: m.errors.authRequired }, { status: 401 });
  if (!id) return NextResponse.json({ error: m.errors.documentNotFound }, { status: 404 });

  const res = await downloadDocument(userId, id);
  if (!res.ok) {
    return NextResponse.json({ error: m.errors.documentNotFound }, { status: res.status === 404 ? 404 : 502 });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      // Always a download, never rendered in our origin.
      "Content-Disposition": res.headers.get("content-disposition") ?? "attachment",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const m = await getMessages();
  const { userId, id } = await userAndId(params);
  if (!userId) return NextResponse.json({ error: m.errors.authRequired }, { status: 401 });
  if (!id) return NextResponse.json({ error: m.errors.documentNotFound }, { status: 404 });

  const res = await deleteDocument(userId, id);
  if (res.status === 404) return NextResponse.json({ error: m.errors.documentNotFound }, { status: 404 });
  if (!res.ok) return NextResponse.json({ error: m.errors.deleteFailed }, { status: 502 });

  // The step to untick is named by the client; a wrong name only skips the sync.
  const { packSlug, documentType } = Object.fromEntries(new URL(request.url).searchParams);
  if (packSlug && documentType) await markPackStep(userId, packSlug, documentType, false);

  return new NextResponse(null, { status: 204 });
}
