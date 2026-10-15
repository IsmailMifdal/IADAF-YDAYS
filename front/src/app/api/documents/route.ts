/** File a piece of evidence in a pack — POST /api/documents (multipart). */

import { NextResponse } from "next/server";

import { auth } from "../../../auth";
import { markPackStep } from "../../lib/demarches";
import {
  MAX_DOCUMENT_BYTES,
  isAllowedDocumentType,
  uploadDocument,
} from "../../lib/documents";
import { hasPackAccess } from "../../lib/entitlements";
import { RATE_LIMITS, hit, tooManyRequests } from "../../lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const limit = await hit(RATE_LIMITS.documentUpload, userId);
  if (!limit.allowed) return tooManyRequests(limit);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide." }, { status: 400 });
  }

  const packSlug = String(form.get("packSlug") ?? "");
  const documentType = String(form.get("documentType") ?? "").trim();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)." }, { status: 413 });
  }
  if (!isAllowedDocumentType(packSlug, documentType)) {
    return NextResponse.json({ error: "Pièce inconnue pour ce pack." }, { status: 400 });
  }
  // The document service trusts us on this: storage is only for owned packs.
  if (!(await hasPackAccess(userId, packSlug))) {
    return NextResponse.json({ error: "Ce pack ne fait pas partie de vos achats." }, { status: 403 });
  }

  try {
    const res = await uploadDocument(userId, packSlug, documentType, file);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // The service's messages are its own validation messages (type, size).
      return NextResponse.json(
        { error: data.message ?? "Le dépôt a échoué." },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }
    await markPackStep(userId, packSlug, documentType, true);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[documents] upload failed", error);
    return NextResponse.json({ error: "Le dépôt a échoué. Réessayez." }, { status: 502 });
  }
}
