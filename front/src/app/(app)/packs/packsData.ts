export type PackColor = "blue" | "green" | "orange" | "violet" | "yellow";

export type PackIconKey =
  | "id-card"
  | "heart-pulse"
  | "house"
  | "receipt"
  | "package";

export type PackData = {
  slug: string;
  title: string;
  price: string;
  color: PackColor;
  icon: PackIconKey;
  shortDescription: string;
  description: string[];
  requiredDocuments: string[];
};

export const packs: PackData[] = [
  {
    slug: "titre-sejour",
    title: "Titre de séjour (ANEF)",
    price: "30€",
    color: "blue",
    icon: "id-card",
    shortDescription:
      "Accompagnement complet pour votre demande de titre de séjour.",
    description: [
      "Guide complet",
      "Choix du type de titre",
      "Checklist personnalisée",
      "Vérification des documents",
      "Assistance IA avancée",
      "Alertes (dates, RDV)",
    ],
    requiredDocuments: [
      "Passeport",
      "Visa",
      "Carte d'identité",
      "Justificatif de domicile",
      "Justificatif de ressources",
      "Assurance maladie",
      "Acte de naissance",
    ],
  },
  {
    slug: "assurance-maladie",
    title: "Assurance maladie (Ameli)",
    price: "10€",
    color: "green",
    icon: "heart-pulse",
    shortDescription: "Création et suivi de votre dossier sécurité sociale.",
    description: [
      "Guide complet",
      "Checklist documents",
      "Vérification des documents",
      "Assistance IA avancée",
      "Alertes documents manquants",
    ],
    requiredDocuments: [
      "Carte d'identité / passeport",
      "Visa ou titre de séjour",
      "Acte de naissance traduit",
      "Justificatif de domicile",
      "RIB",
      "Contrat de travail ou certificat de scolarité",
    ],
  },
  {
    slug: "aide-logement",
    title: "Aide logement (CAF)",
    price: "15€",
    color: "orange",
    icon: "house",
    shortDescription: "Demande d'aide au logement simplifiée.",
    description: [
      "Simulation aides",
      "Guide CAF simplifié",
      "Aide remplissage",
      "Suivi dossier",
      "Notifications",
    ],
    requiredDocuments: [
      "Contrat de location",
      "Attestation de loyer",
      "RIB",
      "Pièce d'identité",
      "Justificatif de revenus",
      "Numéro de sécurité sociale",
    ],
  },
  {
    slug: "impots",
    title: "Déclaration d'impôts",
    price: "10€",
    color: "violet",
    icon: "receipt",
    shortDescription: "Assistance pour votre déclaration fiscale.",
    description: [
      "Explication simplifiée",
      "Aide remplissage",
      "Vérification des données",
      "Simulation",
    ],
    requiredDocuments: [
      "Numéro fiscal",
      "Relevé de revenus",
      "RIB",
      "Situation familiale",
      "Justificatif de domicile",
    ],
  },
  {
    slug: "pack-complet",
    title: "Pack complet",
    price: "50€",
    color: "yellow",
    icon: "package",
    shortDescription:
      "Toutes les démarches incluses avec accompagnement total.",
    description: ["Le contenu de tous les packs réunis en un seul !"],
    requiredDocuments: [
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
  },
];

export function getPackBySlug(slug: string) {
  return packs.find((pack) => pack.slug === slug);
}
