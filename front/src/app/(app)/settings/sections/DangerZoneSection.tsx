"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

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

export default function DangerZoneSection({ account }: { account: Account }) {
  const { m } = useLanguage();
  const t = m.settings.danger;
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const emailMatches =
    confirmEmail.trim().toLowerCase() === account.email.toLowerCase();

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);

    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? m.errors.accountDeleteFailed);
        setIsDeleting(false);
        return;
      }

      // Le compte n'existe plus : la session doit disparaître avec lui.
      await signOut({ redirectTo: "/" });
    } catch {
      setError(m.common.networkError);
      setIsDeleting(false);
    }
  }

  return (
    <SectionCard
      tone="danger"
      title={t.title}
      description={t.description}
    >
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium">{t.whatTitle}</p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-red-700">
          {t.what.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {!isConfirming ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="rounded-xl border border-red-300 bg-white px-5 py-2.5 font-medium text-red-700 hover:bg-red-50 transition"
          >
            {t.start}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Field
            label={t.confirmLabel}
            htmlFor="confirm-email"
            hint={fmt(t.confirmHint, { email: account.email })}
          >
            <input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={account.email}
              dir="ltr"
              className={inputClass}
            />
          </Field>

          <div className="flex items-center gap-3">
            <SubmitButton
              type="button"
              tone="danger"
              isLoading={isDeleting}
              loadingLabel={t.deleting}
              disabled={!emailMatches}
              onClick={handleDelete}
            >
              {t.confirm}
            </SubmitButton>

            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setConfirmEmail("");
                setError(null);
              }}
              disabled={isDeleting}
              className="rounded-xl px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
            >
              {m.common.cancel}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
