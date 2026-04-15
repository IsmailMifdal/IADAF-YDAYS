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
    title: "Titre de sejour (ANEF)",
    price: "30€",
    color: "blue",
    icon: "id-card",
    shortDescription:
      "Accompagnement complet pour votre demande de titre de sejour.",
    description: [
      "Guide complet",
      "Choix du type de titre",
      "Checklist personnalisee",
      "Verification documents",
      "Assistance IA avancee",
      "Alertes (dates, RDV)",
    ],
    requiredDocuments: [
      "Passeport",
      "Visa",
      "Justificatif de domicile",
      "Photo d'identite",
    ],
  },
  {
    slug: "assurance-maladie",
    title: "Assurance maladie (Ameli)",
    price: "10€",
    color: "green",
    icon: "heart-pulse",
    shortDescription: "Creation et suivi de votre dossier securité sociale.",
    description: [
      "Guide complet",
      "Checklist documents",
      "Verification des documents",
      "Assistance IA avancee",
      "Alertes documents manquants",
    ],
    requiredDocuments: [
      "Piece d'identité",
      "Acte de naissance",
      "RIB",
      "Justificatif de domicile",
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
      "RIB",
      "Justificatif de revenus",
      "Attestation de loyer",
    ],
  },
  {
    slug: "impots",
    title: "Déclaration impots",
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
      "Numero fiscal",
      "Bulletins de salaire",
      "Justificatifs de charges",
      "RIB",
    ],
  },
  {
    slug: "pack-complet",
    title: "Pack complet",
    price: "50€",
    color: "yellow",
    icon: "package",
    shortDescription:
      "Toutes les demarches incluses avec accompagnement total.",
    description: ["Le contenu de tous les packs reunis en un seul !"],
    requiredDocuments: [
      "Piece d'identite",
      "Justificatif de domicile",
      "RIB",
      "Documents de situation (emploi, etudes, famille)",
    ],
  },
];

export function getPackBySlug(slug: string) {
  return packs.find((pack) => pack.slug === slug);
}
