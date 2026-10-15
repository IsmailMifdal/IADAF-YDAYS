/**
 * Pieces of evidence filed in a pack's workspace, stored by document-service
 * (encrypted at rest, partitioned by user through the internal token).
 */

import "server-only";

import { getRequiredDocuments } from "../(app)/packs/packContent";
import { GATEWAY_URL, backendAuthHeaders } from "./aiService";
import { EXTRA_DOCUMENT_PREFIX, type StoredDocument } from "./documentTypes";

export { MAX_DOCUMENT_BYTES, type StoredDocument } from "./documentTypes";

/**
 * A document type is either one of the pack's required pieces, or an extra
 * file. Anything else is refused, so the store only holds what the pack asks.
 */
export function isAllowedDocumentType(packSlug: string, documentType: string): boolean {
  if (documentType.length === 0 || documentType.length > 200) return false;
  if (documentType.startsWith(EXTRA_DOCUMENT_PREFIX)) {
    return documentType.length > EXTRA_DOCUMENT_PREFIX.length;
  }
  return getRequiredDocuments(packSlug).includes(documentType);
}

const BASE = `${GATEWAY_URL}/api/documents`;
const TIMEOUT = 30_000;

export async function listDocuments(userId: string, packSlug: string): Promise<StoredDocument[]> {
  const res = await fetch(`${BASE}?packSlug=${encodeURIComponent(packSlug)}`, {
    headers: await backendAuthHeaders(userId),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`document-service answered HTTP ${res.status}`);
  return res.json();
}

/** Returns the service's response as is: the caller relays its status and message. */
export async function uploadDocument(
  userId: string,
  packSlug: string,
  documentType: string,
  file: File,
): Promise<Response> {
  const form = new FormData();
  form.set("packSlug", packSlug);
  form.set("documentType", documentType);
  form.set("file", file, file.name);
  // No Content-Type: fetch sets the multipart boundary itself.
  return fetch(BASE, {
    method: "POST",
    headers: await backendAuthHeaders(userId),
    body: form,
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

export async function downloadDocument(userId: string, id: string): Promise<Response> {
  return fetch(`${BASE}/${encodeURIComponent(id)}/content`, {
    headers: await backendAuthHeaders(userId),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

export async function deleteDocument(userId: string, id: string): Promise<Response> {
  return fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await backendAuthHeaders(userId),
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

/** RGPD erasure of every document of the account. Throws unless confirmed. */
export async function eraseDocumentsData(userId: string): Promise<void> {
  const res = await fetch(`${BASE}/me`, {
    method: "DELETE",
    headers: await backendAuthHeaders(userId, "account:erase"),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`document-service erase failed with HTTP ${res.status}`);
}
