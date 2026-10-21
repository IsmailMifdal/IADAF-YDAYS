"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";

import { AuthCard, AuthMessage, authButtonClass, authInputClass } from "../AuthCard";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Impossible de changer le mot de passe.");
        return;
      }
      setDone(true);
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Lien incomplet" subtitle="Ce lien de réinitialisation est invalide.">
        <AuthMessage tone="error">
          Utilisez le lien complet reçu par e-mail, ou demandez-en un nouveau.
        </AuthMessage>
        <p className="mt-6 text-center text-sm">
          <Link href="/mot-de-passe-oublie" className="text-brand-600 hover:text-brand-700 font-medium">
            Demander un nouveau lien
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Mot de passe modifié" subtitle="Vous pouvez maintenant vous connecter.">
        <AuthMessage tone="success">Votre nouveau mot de passe est enregistré.</AuthMessage>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Se connecter
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nouveau mot de passe" subtitle="Choisissez le mot de passe de votre compte.">
      {error && <AuthMessage tone="error">{error}</AuthMessage>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            8 caractères minimum, avec au moins une lettre et un chiffre.
          </p>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirmez le mot de passe
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </AuthCard>
  );
}
