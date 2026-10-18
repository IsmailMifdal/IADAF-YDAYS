/**
 * Identifiants des onglets des paramètres.
 *
 * Module sans `"use client"` : la page serveur valide le paramètre d'URL avant
 * de le passer au composant client, et une fonction exportée depuis un module
 * client ne peut pas être appelée depuis le serveur.
 */

export const SECTION_IDS = [
  "profil",
  "preferences",
  "securite",
  "achats",
  "danger",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const DEFAULT_SECTION: SectionId = "profil";

export function isSectionId(value: string | undefined): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}
