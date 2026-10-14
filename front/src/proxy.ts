/**
 * Gates every page request through the Auth.js `authorized` callback.
 *
 * Next.js 16 renamed this convention from `middleware` to `proxy`.
 *
 * Only the edge-safe config is imported here — pulling in `auth.ts` would drag
 * `pg` and `bcryptjs` into the Edge bundle and fail at build time.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    // Everything except Next internals, the auth endpoints themselves, and
    // static assets.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
