import type { Metadata } from "next";
import { headers } from "next/headers";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
};

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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl }, headerList] = await Promise.all([
    searchParams,
    headers(),
  ]);

  const host = headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  return (
    <LoginForm
      googleEnabled={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
      callbackUrl={resolveCallbackUrl(callbackUrl, origin)}
    />
  );
}
