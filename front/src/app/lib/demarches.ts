/**
 * The user's folders (démarches), stored by demarches-service.
 *
 * Server-only: calls go through the gateway with an internal token whose
 * subject is the user, so the service only ever returns that user's data.
 */

import "server-only";

import { getRequiredDocuments } from "../(app)/packs/packContent";
import { getPackBySlug } from "../(app)/packs/packsData";
import { GATEWAY_URL, backendAuthHeaders } from "./aiService";

export type FolderStatus = "EN_ATTENTE" | "EN_COURS" | "TERMINEE" | "ANNULEE";

export type Folder = {
  id: number;
  titre: string;
  organismeConcerne: string | null;
  statut: FolderStatus;
  packSlug: string | null;
  dateEcheance: string | null;
  /** Share of completed steps, 0–100. */
  progression: number;
  etapes: { titre: string; completee: boolean }[];
};

/** Back-end type and authority of each pack's folder. */
const PACK_FOLDERS: Record<string, { type: string; organisme: string }> = {
  "titre-sejour": { type: "TITRE_SEJOUR", organisme: "Préfecture (ANEF)" },
  "assurance-maladie": { type: "ASSURANCE_MALADIE", organisme: "CPAM (Ameli)" },
  "aide-logement": { type: "AIDE_LOGEMENT", organisme: "CAF" },
  impots: { type: "IMPOTS", organisme: "DGFiP (impots.gouv.fr)" },
};

async function call(userId: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${GATEWAY_URL}/api/demarches${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(await backendAuthHeaders(userId)),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

/**
 * Erase every démarche of the account (RGPD, art. 17). Throws unless the
 * service confirms, so account deletion is never reported complete when it
 * isn't. The `account:erase` scope is never set on browser-relayed calls.
 */
export async function eraseDemarchesData(userId: string): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/api/demarches/me`, {
    method: "DELETE",
    headers: await backendAuthHeaders(userId, "account:erase"),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`demarches-service erase failed with HTTP ${res.status}`);
}

/**
 * Tick (or untick) the folder step matching a required document. Best effort:
 * the document itself is stored either way, and the next upload or removal
 * fixes a step left out of sync.
 */
export async function markPackStep(
  userId: string,
  packSlug: string,
  documentType: string,
  completee: boolean,
): Promise<void> {
  // The all-access pack has no folder of its own: its packs each have theirs.
  if (!(packSlug in PACK_FOLDERS) || !getRequiredDocuments(packSlug).includes(documentType)) return;
  try {
    const res = await call(userId, `/packs/${packSlug}/etapes`, {
      method: "PUT",
      body: JSON.stringify({ titre: documentType, completee }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    console.error(`[demarches] could not update step of pack ${packSlug}`, error);
  }
}

export async function listFolders(userId: string): Promise<Folder[]> {
  const res = await call(userId, "");
  if (!res.ok) throw new Error(`demarches-service answered HTTP ${res.status}`);
  return res.json();
}

/**
 * Make sure every unlocked pack has its folder (idempotent on the service
 * side). Best effort: a failure for one pack is logged and does not stop the
 * others — the next visit tries again.
 */
export async function ensurePackFolders(userId: string, packSlugs: string[]): Promise<void> {
  await Promise.all(
    packSlugs
      .filter((slug) => slug in PACK_FOLDERS)
      .map(async (slug) => {
        const pack = getPackBySlug(slug);
        if (!pack) return;
        try {
          const res = await call(userId, `/packs/${slug}`, {
            method: "PUT",
            body: JSON.stringify({
              titre: pack.title,
              typeDemarche: PACK_FOLDERS[slug].type,
              organismeConcerne: PACK_FOLDERS[slug].organisme,
              etapes: getRequiredDocuments(slug),
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (error) {
          console.error(`[demarches] could not ensure folder for pack ${slug}`, error);
        }
      }),
  );
}
