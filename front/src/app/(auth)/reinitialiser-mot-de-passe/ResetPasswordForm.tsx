"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";

import { AuthCard, AuthMessage, authButtonClass, authInputClass } from "../AuthCard";
import { useLanguage } from "../../context/LanguageContext";

export default function ResetPasswordForm({ token }: { token: string }) {
  const { m } = useLanguage();
  const t = m.auth.reset;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t.mismatch);
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
        setError(data.error ?? t.failed);
        return;
      }
      setDone(true);
    } catch {
      setError(m.common.networkError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title={t.incompleteTitle} subtitle={t.incompleteSubtitle}>
        <AuthMessage tone="error">
          {t.incompleteText}
        </AuthMessage>
        <p className="mt-6 text-center text-sm">
          <Link href="/mot-de-passe-oublie" className="text-brand-600 hover:text-brand-700 font-medium">
            {t.newLink}
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title={t.doneTitle} subtitle={t.doneSubtitle}>
        <AuthMessage tone="success">{t.doneText}</AuthMessage>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            {m.nav.signIn}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.title} subtitle={t.subtitle}>
      {error && <AuthMessage tone="error">{error}</AuthMessage>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.newPassword}
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
            dir="ltr"
            className={authInputClass}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            {m.auth.passwordRule}
          </p>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.confirm}
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            dir="ltr"
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {isSubmitting ? t.submitting : m.common.save}
        </button>
      </form>
    </AuthCard>
  );
}
