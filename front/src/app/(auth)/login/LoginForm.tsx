"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { AuthBrand, authButtonClass, authCardClass, authInputClass } from "../AuthCard";
import { useLanguage } from "../../context/LanguageContext";

type Props = {
  googleEnabled: boolean;
  callbackUrl: string;
  /** Why the visitor lands here signed out (password changed, signed out everywhere). */
  notice?: string;
};

export default function LoginForm({ googleEnabled, callbackUrl, notice }: Props) {
  const router = useRouter();
  const { m } = useLanguage();
  const t = m.auth.login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // `redirect: false` keeps the failure on this page so the error can be shown
    // inline rather than bouncing through Auth.js' own error screen.
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(
        result.code === "rate_limited"
          ? t.tooManyAttempts
          : t.wrongCredentials,
      );
      setIsSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <AuthBrand />

      <div className={authCardClass}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1 text-sm">{t.subtitle}</p>

        {notice && !error && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
          >
            {notice}
          </div>
        )}

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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                {m.auth.password}
              </label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                {t.forgot}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className={authInputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={authButtonClass}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 rtl:-scale-x-100" />
            )}
            {isSubmitting ? t.submitting : t.submit}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {m.common.or}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { redirectTo: callbackUrl })}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 transition"
            >
              <GoogleMark />
              {m.auth.google}
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          {t.noAccount}{" "}
          <Link
            href="/register"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            {t.createAccount}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500 px-4">
        💡 {t.tip}
      </p>
    </div>
  );
}

/** Google's brand mark, inlined so the page pulls no external asset. */
function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
