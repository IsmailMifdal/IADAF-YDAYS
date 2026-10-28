/**
 * Traductions de l'interface — partie utilisable côté client : types et
 * formatage, sans aucun dictionnaire. Le client reçoit le dictionnaire de sa
 * langue en props (LanguageProvider) ; les quatre ne sont chargés que côté
 * serveur (`./server.ts`), pour ne pas alourdir le JavaScript de la page.
 *
 * Le français (`messages/fr.ts`) est la référence ; les autres langues ont le
 * type `Messages` qui en découle, donc TypeScript refuse un dictionnaire où
 * une clé manque.
 */

import type { fr } from "./messages/fr";

/** Même forme que le dictionnaire français, chaque texte en `string`. */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof fr>;

/** Remplace les `{nom}` d'un texte : fmt("Bonjour {name}", { name: "Amina" }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
