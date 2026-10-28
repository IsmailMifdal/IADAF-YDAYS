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
  /** Nom de la langue dans la langue elle-même : on la reconnaît sans la parler. */
  label: string;
}

// Pas de drapeaux : une langue n'est pas un pays (l'arabe se parle dans
// vingt-deux pays, l'espagnol dans vingt), et un drapeau exclut tous les autres.
export const LANGUAGES: LangOption[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
];

/** Cookie conservant la langue choisie, pour qu'elle survive à un rechargement. */
export const LANG_COOKIE = "iadaf_lang";

export function isLangCode(value: string | undefined): value is LangCode {
  return LANGUAGES.some((option) => option.code === value);
}

/** Sens d'écriture : l'arabe se lit de droite à gauche, toute la page bascule. */
export function dirOf(lang: LangCode): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}

/**
 * Locale des formats (prix, dates). Chiffres latins en arabe : ce sont ceux des
 * documents administratifs français que l'utilisateur doit recopier.
 */
export function intlLocale(lang: LangCode): string {
  return { fr: "fr-FR", en: "en-GB", ar: "ar-u-nu-latn", es: "es-ES" }[lang];
}
