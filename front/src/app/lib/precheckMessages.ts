/**
 * Messages de la pré-vérification automatique dans la langue du visiteur.
 *
 * Le service IA rédige ses verdicts en français, avec des tournures fixes
 * (ai-service/app/documents/analyzer.py et rules.py) dont seule la date varie.
 * On reconnaît la tournure à la vérification, au verdict et, quand il y en a
 * deux, à un mot du message ; une tournure inconnue reste en français plutôt
 * que d'être mal traduite.
 */

import { intlLocale, type LangCode } from "../context/languages";
import { fmt, type Messages } from "../i18n";
import type { DocumentAnalysis } from "./documentTypes";

type Check = DocumentAnalysis["checks"][number];
type Key = keyof Messages["precheck"]["messages"];

function keyOf({ id, status, message }: Check): Key | null {
  switch (`${id}/${status}`) {
    case "readable/error":
      return message.startsWith("Fichier PDF") ? "readablePdf" : "readableImage";
    case "readable/ok":
      return "readableOk";
    case "resolution/warning":
      return "resolutionLow";
    case "sharpness/warning":
      return "blurred";
    case "lighting/warning":
      return message.includes("sombre") ? "tooDark" : "overexposed";
    case "quality/ok":
      return "qualityOk";
    case "content/unknown":
      return "contentUnread";
    case "mrz/ok":
      return "mrzOk";
    case "mrz/warning":
      return "mrzBad";
    case "expiry/unknown":
      return "expiryUnread";
    case "expiry/error":
      return "expired";
    case "expiry/warning":
      return "expiresSoon";
    case "expiry/ok":
      return "validUntil";
    case "recency/unknown":
      return "recencyUnread";
    case "recency/error":
      return "tooOld";
    case "recency/ok":
      return "recent";
    case "iban/unknown":
      return "ibanUnread";
    case "iban/ok":
      return "ibanOk";
    case "iban/error":
      return "ibanInvalid";
    default:
      return null;
  }
}

export function precheckMessage(m: Messages, lang: LangCode, check: Check): string {
  // Le service parle déjà français : son message, tel quel.
  if (lang === "fr") return check.message;

  const key = keyOf(check);
  if (!key) return check.message;
  const template = m.precheck.messages[key];
  if (!template.includes("{date}")) return template;

  const found = /(\d{2})\/(\d{2})\/(\d{4})/.exec(check.message);
  if (!found) return check.message;
  const [, day, month, year] = found;
  const date = new Intl.DateTimeFormat(intlLocale(lang), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
  return fmt(template, { date });
}
