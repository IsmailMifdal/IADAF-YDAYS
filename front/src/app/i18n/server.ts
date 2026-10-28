/**
 * Langue et traductions côté serveur : pages, layouts et routes d'API lisent
 * le même cookie que le sélecteur de langue écrit.
 */

import "server-only";

import { cookies } from "next/headers";

import { isLangCode, LANG_COOKIE, type LangCode } from "../context/languages";
import type { Messages } from "./index";
import { ar } from "./messages/ar";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";

const DICTIONARIES: Record<LangCode, Messages> = { fr, en, ar, es };

export function getDictionary(lang: LangCode): Messages {
  return DICTIONARIES[lang];
}

export async function getLang(): Promise<LangCode> {
  const stored = (await cookies()).get(LANG_COOKIE)?.value;
  return isLangCode(stored) ? stored : "fr";
}

export async function getMessages(): Promise<Messages> {
  return getDictionary(await getLang());
}

type ErrorKey = keyof Messages["errors"];

/**
 * Message d'une erreur de validation (zod) dans la langue du visiteur. Les
 * schémas de `lib/validation.ts` portent des clés de `errors`, pas des
 * phrases ; un message inconnu (défaut de zod) devient « Données invalides ».
 */
export function validationMessage(m: Messages, issue: string | undefined): string {
  return issue && issue in m.errors ? m.errors[issue as ErrorKey] : m.errors.invalidData;
}
