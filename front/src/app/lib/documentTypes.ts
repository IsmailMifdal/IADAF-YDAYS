/**
 * Shapes and limits shared by the server-side document store
 * (`lib/documents.ts`) and the client workspace that files documents.
 */

export type StoredDocument = {
  id: string;
  packSlug: string;
  documentType: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Extra files dropped beyond the required list are filed under this prefix. */
export const EXTRA_DOCUMENT_PREFIX = "Complément : ";

/** Retention enforced by document-service (DOCUMENT_RETENTION_DAYS). */
export const DOCUMENT_RETENTION_DAYS = 180;
