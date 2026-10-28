"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Eye, EyeOff, LogOut } from "lucide-react";

import { passwordStrength } from "../../../lib/validation";
import {
  Alert,
  Field,
  SectionCard,
  SubmitButton,
  inputClass,
  type Account,
} from "../ui";
import { useLanguage } from "../../../context/LanguageContext";
import { fmt } from "../../../i18n";

const STRENGTH_COLORS = [
  "bg-gray-200",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-emerald-500",
];

export default function SecuritySection({ account }: { account: Account }) {
  const { m } = useLanguage();
  const t = m.settings.security;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Un compte OAuth n'a pas de mot de passe local : proposer d'en changer un
  // n'aurait aucun sens.
  if (!account.hasPassword) {
    return (
      <>
        <SectionCard
          title={t.title}
          description={t.description}
        >
          <Alert tone="success">{fmt(t.external, { provider: account.provider })}</Alert>
        </SectionCard>
        <SessionsCard />
      </>
    );
  }

  const strength = passwordStrength(newPassword);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setChanged(false);
    setIsSaving(true);

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? m.errors.passwordChangeFailed);
        return;
      }

      setChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      // Every session has just been closed, this one included (server side).
      await signOut({ redirectTo: "/login?raison=mot-de-passe-modifie" });
    } catch {
      setError(m.common.networkError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <SectionCard
        title={m.auth.password}
        description={t.passwordDescription}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          {changed && (
            <Alert tone="success">{t.changed}</Alert>
          )}
  
          <Field label={t.current} htmlFor="current-password">
            <input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              dir="ltr"
              className={inputClass}
            />
          </Field>
  
          <Field
            label={m.auth.reset.newPassword}
            htmlFor="new-password"
            hint={m.auth.passwordRule}
          >
            <div className="relative">
              <input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                className={`${inputClass} pe-11`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? t.hide : t.show}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPasswords ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </Field>
  
          {newPassword.length > 0 && (
            <div>
              <div className="flex gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      level <= strength ? STRENGTH_COLORS[strength] : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {fmt(t.strength, { level: t.strengthLevels[strength] })}
              </p>
            </div>
          )}
  
          <div className="pt-1">
            <SubmitButton
              isLoading={isSaving}
              loadingLabel={t.changing}
              disabled={!currentPassword || !newPassword}
            >
              {t.change}
            </SubmitButton>
          </div>
        </form>
      </SectionCard>
      <SessionsCard />
    </>
  );
}

/** "Sign out everywhere": a lost phone, a shared computer. */
function SessionsCard() {
  const { m } = useLanguage();
  const t = m.settings.security;
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function closeEverywhere() {
    setError(null);
    setIsClosing(true);
    try {
      const res = await fetch("/api/account/sessions", { method: "DELETE" });
      if (!res.ok) {
        setError(m.errors.sessionsCloseFailed);
        return;
      }
      await signOut({ redirectTo: "/login?raison=deconnexion-partout" });
    } catch {
      setError(m.common.networkError);
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <SectionCard
      title={t.sessions}
      description={t.sessionsDescription}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <button
        type="button"
        onClick={closeEverywhere}
        disabled={isClosing}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4 rtl:-scale-x-100" />
        {isClosing ? t.signingOut : t.signOutEverywhere}
      </button>
    </SectionCard>
  );
}
