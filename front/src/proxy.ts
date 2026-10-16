/**
 * Every page request: the Auth.js gate (`authorized` in auth.config.ts, with
 * the session-revocation check of auth.ts), then a Content Security Policy
 * with a fresh nonce.
 *
 * Next.js 16 renamed this convention from `middleware` to `proxy`, and runs it
 * on Node.js: the full Auth.js setup, database included, works here.
 */

import { NextResponse } from "next/server";

import { auth } from "./auth";

/**
 * Scripts run only if they carry this request's nonce — Next.js adds it to its
 * own, read from the request header below — or were loaded by one that does
 * ('strict-dynamic'). An injected <script> or onclick="…" never runs: that is
 * the protection against cross-site scripting (XSS) this policy exists for.
 *
 * Styles stay 'unsafe-inline': a few components set a width inline (progress
 * bars), and an injected style cannot run code.
 */
function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // React's development build needs eval for its error overlay; production never does.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // Explicit: under 'strict-dynamic', 'self' alone would not cover the
    // service worker (public/sw.js).
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
  ].join("; ");
}

export default auth((request) => {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);

  // Next.js reads the nonce from the request's policy and puts it on every
  // script it renders. These headers replace the request's: start from them,
  // or the session cookie is gone.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
});

export const config = {
  matcher: [
    // Everything except Next internals, the auth endpoints themselves, and
    // static assets — the installable-app files included: a visitor who is
    // not signed in must get them, not a redirect to /login.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icon/|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
