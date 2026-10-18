/**
 * Auth.js entry point (Node runtime).
 *
 * Two ways in:
 *   - Credentials — email + bcrypt password stored in `users.app_users`
 *   - Google OAuth — enabled only when AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are set,
 *     so the app still boots without Google credentials configured.
 */

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";

import { authConfig } from "./auth.config";
import { RATE_LIMITS, clientIp, hitAll } from "./app/lib/rateLimit";
import { findUserByEmail, sessionIsValid, upsertOAuthUser, verifyPassword } from "./app/lib/users";
import { credentialsSchema } from "./app/lib/validation";

/** Surfaces to the login form as `result.code`, distinct from a bad password. */
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(raw, request) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      // Before the bcrypt comparison, so a flood of guesses costs us nothing.
      const limit = await hitAll([
        [RATE_LIMITS.loginIp, clientIp(request.headers)],
        [RATE_LIMITS.loginEmail, parsed.data.email.trim().toLowerCase()],
      ]);
      if (!limit.allowed) throw new RateLimitedSignin();

      const user = await findUserByEmail(parsed.data.email);
      if (!user) return null;

      const valid = await verifyPassword(user, parsed.data.password);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ allowDangerousEmailAccountLinking: true }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,

    /**
     * The base token (auth.config.ts), plus revocation. The sign-in instant is
     * recorded once and kept when Auth.js renews the token — renewal must not
     * launder a stolen session. A session opened before a revocation, or whose
     * account is gone, ends here: on every request, through the middleware.
     */
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);
      if (params.user) token.signedInAt = Date.now();
      if (typeof token.id !== "string") return token;

      // Tokens issued before this check existed: `iat` (seconds) stands in.
      const signedInAt =
        typeof token.signedInAt === "number" ? token.signedInAt : (token.iat ?? 0) * 1000;
      try {
        return (await sessionIsValid(token.id, signedInAt)) ? token : null;
      } catch (error) {
        // Database unreachable: nothing works meanwhile anyway, and signing
        // everyone out would outlast the outage.
        console.error("[auth] session check failed", error);
        return token;
      }
    },

    /**
     * Mirror OAuth identities into `users.app_users` so every session — however
     * it was obtained — resolves to a row we own, and swap in our own id.
     */
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      if (!user.email) return false;

      const record = await upsertOAuthUser({
        email: user.email,
        name: user.name,
        image: user.image,
        provider: account.provider,
      });
      user.id = record.id;
      return true;
    },
  },
});
