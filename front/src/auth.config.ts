/**
 * Edge-safe half of the Auth.js configuration.
 *
 * The middleware runs on the Edge runtime, where `pg` and `bcryptjs` cannot load.
 * Everything the middleware needs lives here; the providers that touch the
 * database are added in `auth.ts`, which only runs on Node.
 */

import type { NextAuthConfig } from "next-auth";

/** Routes reachable without a session. Everything else requires sign-in. */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/nosPacks",
  "/procedures",
  // Reached from a link in an e-mail, often without being signed in.
  "/desinscription",
  // Legal pages must be readable before signing up or paying.
  "/mentions-legales",
  "/confidentialite",
  "/cgv",
  // Account recovery: by definition, the visitor cannot sign in.
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;

  // API routes are let through here and enforce their own access rules, so an
  // unauthenticated call gets a JSON 401 instead of a redirect to the HTML
  // login page. It also keeps the Stripe webhook reachable — Stripe has no
  // session and must not be bounced to /login.
  return pathname.startsWith("/api/");
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  session: {
    // Credentials sign-in requires JWT sessions — there is no database session
    // row to look up.
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },

  callbacks: {
    /** Consulted by the middleware to gate every request. */
    authorized({ auth, request }) {
      if (isPublicRoute(request.nextUrl.pathname)) return true;
      return Boolean(auth?.user);
    },

    /** Persist the database id on the token so the session can expose it. */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // Fired by `useSession().update()` after a profile rename, so the new name
      // reaches the sidebar without forcing a fresh sign-in.
      if (trigger === "update" && typeof session?.name === "string") {
        token.name = session.name;
      }

      return token;
    },

    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // Filled in by `auth.ts` — the middleware never needs them.
  providers: [],
} satisfies NextAuthConfig;
