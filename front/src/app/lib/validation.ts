/** Shared input schemas for the authentication and account endpoints. */

import { z } from "zod";

/** Single source of truth for the password policy, reused at every entry point. */
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(200, "Le mot de passe est trop long.")
  .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(120, "Le nom est trop long.");

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .max(255, "L’adresse e-mail est trop longue."),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel."),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Le nouveau mot de passe doit être différent de l’ancien.",
    path: ["newPassword"],
  });

export const deleteAccountSchema = z.object({
  /** Typed back by the user to confirm — guards against an accidental click. */
  confirmEmail: z.string().trim().email("Adresse e-mail invalide."),
});

/** E-mail volunteered in the welcome chat — only accepted with explicit consent. */
export const leadSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide.").max(255),
  source: z.enum(["accueil_chat"]),
  /** Must be the literal `true`: a missing or false box is not consent. */
  consent: z.literal(true),
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
