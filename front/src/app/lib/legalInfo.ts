/**
 * Legal identity of the service — the single source for the legal notice,
 * the privacy policy, the terms of sale and the footer.
 *
 * ⚠️ Empty fields must be filled in before going live: publishing a site
 * without the publisher's identity (LCEN, art. 6) or selling to consumers
 * without a mediator (Code de la consommation, art. L612-1) is unlawful.
 * The legal pages show a warning banner as long as `missingLegalFields()`
 * returns anything.
 */

export const LEGAL_INFO = {
  /** Company name, or the individual's full name for a sole trader. */
  publisherName: "",
  /** e.g. "SAS au capital de 1 000 €", "Entrepreneur individuel". */
  legalForm: "",
  address: "",
  /** SIREN/SIRET, and RCS city where registered. */
  registration: "",
  /**
   * VAT status as printed on the terms, e.g. "TVA non applicable, art. 293 B
   * du CGI" for a micro-entreprise, or the intra-community VAT number.
   */
  vat: "",
  publicationDirector: "",
  contactEmail: "",
  /** Optional: shown only when set. */
  phone: "",
  /** Address for exercising RGPD rights — may equal `contactEmail`. */
  privacyEmail: "",
  host: {
    name: "",
    address: "",
    phone: "",
  },
  /** Consumer mediator the business has signed up with (mandatory). */
  mediator: {
    name: "",
    website: "",
  },
  /**
   * Safeguard for the transfer of chat messages to the LLM provider when it is
   * outside the EU, e.g. "Data Privacy Framework UE–États-Unis" or "clauses
   * contractuelles types de la Commission européenne". Leave empty only if
   * the provider is EU-hosted (see OPENAI_BASE_URL in .env.example).
   */
  llmProvider: {
    name: "OpenAI, L.L.C. (États-Unis)",
    transferSafeguard: "",
  },
} as const;

const REQUIRED: Array<[string, string]> = [
  ["publisherName", LEGAL_INFO.publisherName],
  ["legalForm", LEGAL_INFO.legalForm],
  ["address", LEGAL_INFO.address],
  ["registration", LEGAL_INFO.registration],
  ["vat", LEGAL_INFO.vat],
  ["publicationDirector", LEGAL_INFO.publicationDirector],
  ["contactEmail", LEGAL_INFO.contactEmail],
  ["privacyEmail", LEGAL_INFO.privacyEmail],
  ["host.name", LEGAL_INFO.host.name],
  ["host.address", LEGAL_INFO.host.address],
  ["host.phone", LEGAL_INFO.host.phone],
  ["mediator.name", LEGAL_INFO.mediator.name],
  ["mediator.website", LEGAL_INFO.mediator.website],
  ["llmProvider.transferSafeguard", LEGAL_INFO.llmProvider.transferSafeguard],
];

/** Names of the fields still empty — an empty list means ready to publish. */
export function missingLegalFields(): string[] {
  return REQUIRED.filter(([, value]) => !value.trim()).map(([name]) => name);
}

/** Shown in place of a value still missing, so a gap is never silent. */
export function orPlaceholder(value: string): string {
  return value.trim() || "[à compléter]";
}

/**
 * Version of the terms of sale. Bump it when the CGV change: it is stored in
 * Stripe metadata with each order, so we can tell which terms a buyer accepted.
 */
export const CGV_VERSION = "2026-10-14";
