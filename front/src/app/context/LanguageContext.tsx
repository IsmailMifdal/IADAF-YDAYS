"use client";

import { createContext, useCallback, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { Messages } from "../i18n";
import { dirOf, LANG_COOKIE, type LangCode } from "./languages";

// Réexportés pour que les imports existants depuis ce module continuent de
// fonctionner ; la définition vit dans `languages.ts`, utilisable côté serveur.
export {
  LANGUAGES,
  LANG_COOKIE,
  isLangCode,
  type LangCode,
  type LangOption,
} from "./languages";

interface LanguageContextValue {
  lang: LangCode;
  /** Textes de l'interface dans la langue courante. */
  m: Messages;
  setLang: (lang: LangCode) => void;
  /** Vrai pendant que le serveur renvoie la page dans la nouvelle langue. */
  isSwitching: boolean;
}

// Sans valeur par défaut : un dictionnaire ici partirait dans le JavaScript
// de chaque page. Tout l'arbre est sous LanguageProvider (layout racine).
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  lang,
  messages,
}: {
  children: ReactNode;
  /**
   * Lue côté serveur dans le cookie par le layout racine, avec le dictionnaire
   * correspondant : la page arrive directement dans la bonne langue, sans
   * flash de français ni écart d'hydratation.
   */
  lang: LangCode;
  messages: Messages;
}) {
  const router = useRouter();
  const [isSwitching, startTransition] = useTransition();

  const setLang = useCallback(
    (next: LangCode) => {
      // Un an, même site : une préférence d'affichage, rien de sensible.
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = dirOf(next);
      // Le serveur relit le cookie : pages serveur et client reviennent
      // ensemble dans la nouvelle langue.
      startTransition(() => router.refresh());
    },
    [router],
  );

  return (
    <LanguageContext.Provider value={{ lang, m: messages, setLang, isSwitching }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage() hors de LanguageProvider");
  return value;
}
