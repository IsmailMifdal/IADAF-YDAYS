/**
 * Noms des pièces à fournir, traduits.
 *
 * Contenu payant (voir packContent.ts) : module serveur, utilisé seulement
 * une fois l'accès au pack vérifié — ces noms ne doivent apparaître ni dans
 * le JavaScript public, ni dans le dictionnaire envoyé à chaque page.
 *
 * Le nom français reste la clé enregistrée avec chaque pièce déposée ; seul
 * l'affichage change. L'interface montre aussi le nom français : c'est celui
 * que l'utilisateur lira sur les sites et courriers de l'administration.
 */

import "server-only";

import type { LangCode } from "../context/languages";
import { EXTRA_DOCUMENT_PREFIX } from "../lib/documentTypes";

type Translated = Exclude<LangCode, "fr">;

const NAMES: Record<Translated, Record<string, string>> = {
  en: {
    Passeport: "Passport",
    Visa: "Visa",
    "Carte d'identité": "ID card",
    "Justificatif de domicile": "Proof of address",
    "Justificatif de ressources": "Proof of financial resources",
    "Assurance maladie": "Health insurance",
    "Acte de naissance": "Birth certificate",
    "Carte d'identité / passeport": "ID card / passport",
    "Visa ou titre de séjour": "Visa or residence permit",
    "Acte de naissance traduit": "Translated birth certificate",
    RIB: "Bank details (RIB)",
    "Contrat de travail ou certificat de scolarité": "Employment contract or school enrolment certificate",
    "Contrat de location": "Rental agreement",
    "Attestation de loyer": "Rent certificate",
    "Pièce d'identité": "Identity document",
    "Justificatif de revenus": "Proof of income",
    "Numéro de sécurité sociale": "Social security number",
    "Numéro fiscal": "Tax number",
    "Relevé de revenus": "Income statement",
    "Situation familiale": "Family situation",
  },
  ar: {
    Passeport: "جواز السفر",
    Visa: "التأشيرة",
    "Carte d'identité": "بطاقة الهوية",
    "Justificatif de domicile": "إثبات السكن",
    "Justificatif de ressources": "إثبات الموارد المالية",
    "Assurance maladie": "التأمين الصحي",
    "Acte de naissance": "شهادة الميلاد",
    "Carte d'identité / passeport": "بطاقة الهوية / جواز السفر",
    "Visa ou titre de séjour": "التأشيرة أو بطاقة الإقامة",
    "Acte de naissance traduit": "شهادة ميلاد مترجمة",
    RIB: "كشف الحساب البنكي (RIB)",
    "Contrat de travail ou certificat de scolarité": "عقد العمل أو شهادة التسجيل الدراسي",
    "Contrat de location": "عقد الإيجار",
    "Attestation de loyer": "شهادة الإيجار",
    "Pièce d'identité": "وثيقة الهوية",
    "Justificatif de revenus": "إثبات الدخل",
    "Numéro de sécurité sociale": "رقم الضمان الاجتماعي",
    "Numéro fiscal": "الرقم الضريبي",
    "Relevé de revenus": "كشف الدخل",
    "Situation familiale": "الوضع العائلي",
  },
  es: {
    Passeport: "Pasaporte",
    Visa: "Visado",
    "Carte d'identité": "Tarjeta de identidad",
    "Justificatif de domicile": "Justificante de domicilio",
    "Justificatif de ressources": "Justificante de recursos económicos",
    "Assurance maladie": "Seguro médico",
    "Acte de naissance": "Partida de nacimiento",
    "Carte d'identité / passeport": "Tarjeta de identidad / pasaporte",
    "Visa ou titre de séjour": "Visado o permiso de residencia",
    "Acte de naissance traduit": "Partida de nacimiento traducida",
    RIB: "Datos bancarios (RIB)",
    "Contrat de travail ou certificat de scolarité": "Contrato de trabajo o certificado de matrícula",
    "Contrat de location": "Contrato de alquiler",
    "Attestation de loyer": "Certificado de alquiler",
    "Pièce d'identité": "Documento de identidad",
    "Justificatif de revenus": "Justificante de ingresos",
    "Numéro de sécurité sociale": "Número de la Seguridad Social",
    "Numéro fiscal": "Número fiscal",
    "Relevé de revenus": "Resumen de ingresos",
    "Situation familiale": "Situación familiar",
  },
};

/** Démarche d'origine, en tête des pièces du pack complet : « [Titre de séjour] Visa ». */
const GROUPS: Record<Translated, Record<string, string>> = {
  en: {
    "Assurance maladie": "Health insurance",
    "Aides au logement": "Housing benefits",
    "Titre de séjour": "Residence permit",
    "Déclaration d'impôt": "Tax return",
  },
  ar: {
    "Assurance maladie": "التأمين الصحي",
    "Aides au logement": "مساعدات السكن",
    "Titre de séjour": "بطاقة الإقامة",
    "Déclaration d'impôt": "التصريح الضريبي",
  },
  es: {
    "Assurance maladie": "Seguro médico",
    "Aides au logement": "Ayudas a la vivienda",
    "Titre de séjour": "Permiso de residencia",
    "Déclaration d'impôt": "Declaración de impuestos",
  },
};

const EXTRA: Record<Translated, string> = {
  en: "Additional: ",
  ar: "ملف إضافي: ",
  es: "Adicional: ",
};

/** Libellé affiché d'une pièce ; le nom français si aucune traduction n'existe. */
export function documentLabel(lang: LangCode, frenchName: string): string {
  if (lang === "fr") return frenchName;

  if (frenchName.startsWith(EXTRA_DOCUMENT_PREFIX)) {
    // La suite est le nom du fichier choisi par l'utilisateur : intacte.
    return EXTRA[lang] + frenchName.slice(EXTRA_DOCUMENT_PREFIX.length);
  }

  const grouped = /^\[(.+?)\] (.+)$/.exec(frenchName);
  if (grouped) {
    const [, group, name] = grouped;
    return `[${GROUPS[lang][group] ?? group}] ${NAMES[lang][name] ?? name}`;
  }

  return NAMES[lang][frenchName] ?? frenchName;
}

/** Libellés d'une liste de pièces, par nom français. */
export function documentLabels(lang: LangCode, frenchNames: string[]): Record<string, string> {
  return Object.fromEntries(frenchNames.map((name) => [name, documentLabel(lang, name)]));
}
