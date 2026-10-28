import { intlLocale, type LangCode } from "../../context/languages";
import type { Messages } from "../../i18n";

export type PackColor = "blue" | "green" | "orange" | "violet" | "yellow";

export type PackIconKey =
  | "id-card"
  | "heart-pulse"
  | "house"
  | "receipt"
  | "package";

/**
 * Public catalogue — what anyone may see before buying.
 *
 * Imported by client components rendered on public pages (footer, welcome
 * chat), so everything here ships in the browser bundle. Paid content lives
 * in `packContent.ts`, which is server-only.
 */
export type PackData = {
  slug: string;
  title: string;
  /**
   * Authoritative price, in euro cents.
   *
   * Stripe bills in integer minor units, and the amount charged must never be
   * derived from a display string — this field is the single source of truth
   * for both the checkout session and what the UI shows.
   */
  priceCents: number;
  color: PackColor;
  icon: PackIconKey;
  shortDescription: string;
  description: string[];
};

/**
 * Pack qui débloque tous les autres.
 *
 * Défini ici plutôt que dans `entitlements.ts` : c'est une notion de
 * catalogue, et les composants qui l'utilisent n'ont pas à importer la couche
 * base de données pour la connaître.
 */
export const ALL_ACCESS_SLUG = "pack-complet";

/** Render a cent amount as a euro price in the visitor's format (30 €, €30). */
export function formatPrice(priceCents: number, lang: LangCode = "fr"): string {
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}

export const packs: PackData[] = [
  {
    slug: "titre-sejour",
    title: "Titre de séjour (ANEF)",
    priceCents: 3000,
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
  },
  {
    slug: "assurance-maladie",
    title: "Assurance maladie (Ameli)",
    priceCents: 1000,
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
  },
  {
    slug: "aide-logement",
    title: "Aide logement (CAF)",
    priceCents: 1500,
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
  },
  {
    slug: "impots",
    title: "Déclaration d'impôts",
    priceCents: 1000,
    color: "violet",
    icon: "receipt",
    shortDescription: "Assistance pour votre déclaration fiscale.",
    description: [
      "Explication simplifiée",
      "Aide remplissage",
      "Vérification des données",
      "Simulation",
    ],
  },
  {
    slug: "pack-complet",
    title: "Pack complet",
    priceCents: 5000,
    color: "yellow",
    icon: "package",
    shortDescription:
      "Toutes les démarches incluses avec accompagnement total.",
    description: ["Le contenu de tous les packs réunis en un seul !"],
  },
];

export function getPackBySlug(slug: string) {
  return packs.find((pack) => pack.slug === slug);
}

type PackText = { title: string; shortDescription: string; features: readonly string[] };

/**
 * The pack with its texts in the visitor's language. The French fields above
 * stay the reference (Stripe, server logs); the dictionary carries the
 * translations, keyed by slug.
 */
export function localizedPack(m: Messages, pack: PackData): PackData {
  const text = (m.packs.catalog as Record<string, PackText>)[pack.slug];
  if (!text) return pack;
  return {
    ...pack,
    title: text.title,
    shortDescription: text.shortDescription,
    description: [...text.features],
  };
}
