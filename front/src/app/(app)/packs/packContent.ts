import "server-only";

/**
 * Paid content of each pack — the documents to gather.
 *
 * Server-only: importing this module from a client component fails the build,
 * so the list cannot leak into the public bundle again. It reaches the browser
 * only as props of the pack workspace, after `/packs/[slug]` has verified the
 * entitlement.
 */

const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  "titre-sejour": [
    "Passeport",
    "Visa",
    "Carte d'identité",
    "Justificatif de domicile",
    "Justificatif de ressources",
    "Assurance maladie",
    "Acte de naissance",
  ],
  "assurance-maladie": [
    "Carte d'identité / passeport",
    "Visa ou titre de séjour",
    "Acte de naissance traduit",
    "Justificatif de domicile",
    "RIB",
    "Contrat de travail ou certificat de scolarité",
  ],
  "aide-logement": [
    "Contrat de location",
    "Attestation de loyer",
    "RIB",
    "Pièce d'identité",
    "Justificatif de revenus",
    "Numéro de sécurité sociale",
  ],
  "impots": [
    "Numéro fiscal",
    "Relevé de revenus",
    "RIB",
    "Situation familiale",
    "Justificatif de domicile",
  ],
  "pack-complet": [
    "[Assurance maladie] Carte d'identité / passeport",
    "[Assurance maladie] Visa ou titre de séjour",
    "[Assurance maladie] Acte de naissance traduit",
    "[Assurance maladie] Justificatif de domicile",
    "[Assurance maladie] RIB",
    "[Assurance maladie] Contrat de travail ou certificat de scolarité",
    "[Aides au logement] Contrat de location",
    "[Aides au logement] Attestation de loyer",
    "[Aides au logement] RIB",
    "[Aides au logement] Pièce d'identité",
    "[Aides au logement] Justificatif de revenus",
    "[Aides au logement] Numéro de sécurité sociale",
    "[Titre de séjour] Passeport",
    "[Titre de séjour] Visa",
    "[Titre de séjour] Carte d'identité",
    "[Titre de séjour] Justificatif de domicile",
    "[Titre de séjour] Justificatif de ressources",
    "[Titre de séjour] Assurance maladie",
    "[Titre de séjour] Acte de naissance",
    "[Déclaration d'impôt] Numéro fiscal",
    "[Déclaration d'impôt] Relevé de revenus",
    "[Déclaration d'impôt] RIB",
    "[Déclaration d'impôt] Situation familiale",
    "[Déclaration d'impôt] Justificatif de domicile",
  ],
};

export function getRequiredDocuments(slug: string): string[] {
  return REQUIRED_DOCUMENTS[slug] ?? [];
}
