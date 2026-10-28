import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../../../auth";
import LoginForm from "./LoginForm";
import { getMessages } from "../../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.login.title };
}

/**
 * Reduce `callbackUrl` to a same-origin path.
 *
 * The proxy hands over an absolute URL, but the parameter is also freely
 * editable in the address bar — anything pointing elsewhere is dropped so the
 * page cannot be turned into an open redirect.
 */
function resolveCallbackUrl(raw: string | undefined, origin: string): string {
  if (!raw) return "/";

  // Protocol-relative URLs ("//evil.com") are absolute despite the leading slash.
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  try {
    const url = new URL(raw);
    if (url.origin === origin) return `${url.pathname}${url.search}`;
  } catch {
    // Not parseable as a URL — fall through to the safe default.
  }

  return "/";
}

/** Fixed messages only: the query string chooses one, it never supplies text. */
const NOTICES: Record<string, "passwordChanged" | "signedOutEverywhere"> = {
  "mot-de-passe-modifie": "passwordChanged",
  "deconnexion-partout": "signedOutEverywhere",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; raison?: string }>;
}) {
  const [{ callbackUrl, raison }, headerList, m, session] = await Promise.all([
    searchParams,
    headers(),
    getMessages(),
    auth(),
  ]);
  const notice =
    raison && Object.hasOwn(NOTICES, raison) ? m.auth.login.notices[NOTICES[raison]] : undefined;

  const host = headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;
  const destination = resolveCallbackUrl(callbackUrl, origin);

  // Déjà connecté : rien à saisir, on va directement où l'on voulait aller.
  if (session?.user) redirect(destination === "/" ? "/dashboard" : destination);

  return (
    <LoginForm
      googleEnabled={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
      callbackUrl={destination}
      notice={notice}
    />
  );
}
