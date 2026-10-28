"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

import { AuthCard, AuthMessage, authButtonClass, authInputClass } from "../AuthCard";
import { useLanguage } from "../../context/LanguageContext";

export default function ForgotPasswordForm() {
  const { m } = useLanguage();
  const t = m.auth.forgot;
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
        setError(data.error ?? t.failed);
        return;
      }
      setSent(data.message);
    } catch {
      setError(m.common.networkError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={t.title}
      subtitle={t.subtitle}
    >
      {error && <AuthMessage tone="error">{error}</AuthMessage>}

      {sent ? (
        <AuthMessage tone="success">
          {sent} {t.checkSpam}
        </AuthMessage>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              {m.auth.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={m.auth.emailPlaceholder}
              dir="ltr"
              className={authInputClass}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {isSubmitting ? t.submitting : t.submit}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
          {m.auth.backToLogin}
        </Link>
      </p>
    </AuthCard>
  );
}
