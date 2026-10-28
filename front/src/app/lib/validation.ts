/**
 * Shared input schemas for the authentication and account endpoints.
 *
 * Messages are keys of the `errors` dictionary, not sentences: the route
 * translates them into the visitor's language (validationMessage).
 */

import { z } from "zod";

/** Single source of truth for the password policy, reused at every entry point. */
export const passwordSchema = z
  .string()
  .min(8, "passwordMin")
  .max(200, "passwordMax")
  .regex(/[a-zA-Z]/, "passwordLetter")
  .regex(/[0-9]/, "passwordDigit");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "nameMin")
  .max(120, "nameMax");

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: z
    .string()
    .trim()
    .email("emailInvalid")
    .max(255, "emailTooLong"),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "currentPasswordRequired"),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "newPasswordSame",
    path: ["newPassword"],
  });

export const deleteAccountSchema = z.object({
  /** Typed back by the user to confirm — guards against an accidental click. */
  confirmEmail: z.string().trim().email("emailInvalid"),
});

/** E-mail volunteered in the welcome chat — only accepted with explicit consent. */
export const leadSchema = z.object({
  email: z.string().trim().email("emailInvalid").max(255),
  source: z.enum(["accueil_chat"]),
  /** Must be the literal `true`: a missing or false box is not consent. */
  consent: z.literal(true),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("emailInvalid").max(255),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "invalidResetLink"),
  password: passwordSchema,
});

export const unsubscribeSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Rough password strength score (0–4), used only to give live feedback in the
 * UI. The binding rule remains `passwordSchema`, enforced server-side.
 */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}
