"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { AuthBrand, authButtonClass, authCardClass, authInputClass } from "../AuthCard";
import { useLanguage } from "../../context/LanguageContext";

export default function RegisterForm() {
  const router = useRouter();
  const { m } = useLanguage();
  const t = m.auth.register;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload.error ?? t.failed);
        setIsSubmitting(false);
        return;
      }

      // Sign the new account straight in — asking for the same password twice
      // in a row is pure friction.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(m.common.networkError);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <AuthBrand />

      <div className={authCardClass}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1 text-sm">{t.subtitle}</p>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t.name}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              dir="auto"
              className={authInputClass}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {m.auth.password}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={authButtonClass}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {isSubmitting ? t.submitting : t.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t.haveAccount}{" "}
          <Link
            href="/login"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            {t.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
