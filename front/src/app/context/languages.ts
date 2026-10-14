/**
 * Langues supportées et helpers associés.
 *
 * Module volontairement sans `"use client"` : le layout racine (composant
 * serveur) lit le cookie de langue, et une fonction exportée depuis un module
 * client ne peut pas être appelée depuis le serveur.
 */

export type LangCode = "fr" | "en" | "ar" | "es";

export interface LangOption {
  code: LangCode;
  label: string;
  flag: string;
}

export const LANGUAGES: LangOption[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

/** Cookie conservant la langue choisie, pour qu'elle survive à un rechargement. */
export const LANG_COOKIE = "iadaf_lang";

export function isLangCode(value: string | undefined): value is LangCode {
  return LANGUAGES.some((option) => option.code === value);
}
