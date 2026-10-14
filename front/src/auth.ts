/**
 * Auth.js entry point (Node runtime).
 *
 * Two ways in:
 *   - Credentials — email + bcrypt password stored in `users.app_users`
 *   - Google OAuth — enabled only when AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are set,
 *     so the app still boots without Google credentials configured.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";

import { authConfig } from "./auth.config";
import { findUserByEmail, upsertOAuthUser, verifyPassword } from "./app/lib/users";
import { credentialsSchema } from "./app/lib/validation";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

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
