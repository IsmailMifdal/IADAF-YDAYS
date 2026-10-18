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

export type CheckStatus = "ok" | "warning" | "error" | "unknown";

/** Automated pre-check of one filed document (ai-service, Phase 4). */
export type DocumentAnalysis = {
  documentId: string;
  category: "identity" | "address" | "bank" | "other";
  status: CheckStatus;
  textRead: boolean;
  checks: { id: string; status: CheckStatus; message: string }[];
};

/**
 * What each check is about, in words that carry no value read in the
 * document — safe to hand to the assistant (no dates, no names, no numbers).
 */
export const CHECK_LABELS: Record<string, string> = {
  readable: "lisibilité du fichier",
  quality: "qualité de l'image",
  resolution: "résolution",
  sharpness: "netteté",
  lighting: "luminosité",
  content: "lecture du contenu",
  mrz: "bande de lecture automatique",
  expiry: "date de validité",
  recency: "ancienneté du justificatif",
  iban: "IBAN",
};
