"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

import { AuthCard, AuthMessage, authButtonClass, authInputClass } from "../AuthCard";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Impossible d’envoyer l’e-mail. Réessayez.");
        return;
      }
      setSent(data.message);
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Indiquez l’adresse de votre compte : nous vous envoyons un lien pour en choisir un nouveau."
    >
      {error && <AuthMessage tone="error">{error}</AuthMessage>}

      {sent ? (
        <AuthMessage tone="success">
          {sent} Pensez à vérifier vos courriers indésirables. Le lien est
          valable 30 minutes.
        </AuthMessage>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className={authInputClass}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {isSubmitting ? "Envoi…" : "Recevoir le lien"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Retour à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
