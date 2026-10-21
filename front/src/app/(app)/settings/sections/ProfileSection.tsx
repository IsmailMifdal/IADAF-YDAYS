"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import { useToast } from "../../../components/ui/Toast";

import {
  Alert,
  Field,
  SectionCard,
  SubmitButton,
  formatDate,
  getInitials,
  inputClass,
  type Account,
} from "../ui";

export default function ProfileSection({
  account,
  onAccountChange,
}: {
  account: Account;
  onAccountChange: (account: Account) => void;
}) {
  const { update: updateSession } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState(account.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = name.trim() !== (account.name ?? "").trim();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Impossible d’enregistrer les modifications.");
        return;
      }

      onAccountChange({ ...account, name: data.name });
      // Rafraîchit le JWT pour que la sidebar affiche le nouveau nom
      // sans imposer une reconnexion.
      await updateSession({ name: data.name });
      setSaved(true);
      toast("Profil mis à jour.");
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Profil"
        description="Ces informations apparaissent dans votre espace personnel."
      >
        <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center text-xl font-semibold shrink-0">
            {getInitials(account.name, account.email)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {account.name ?? "Compte sans nom"}
            </p>
            <p className="text-sm text-gray-500 truncate">{account.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Membre depuis le {formatDate(account.createdAt)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          {saved && !isDirty && (
            <Alert tone="success">Vos modifications ont été enregistrées.</Alert>
          )}

          <Field label="Nom complet" htmlFor="profile-name">
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              minLength={2}
              maxLength={120}
              required
              className={inputClass}
            />
          </Field>

          <Field
            label="Adresse e-mail"
            htmlFor="profile-email"
            hint="L’adresse sert d’identifiant de connexion et ne peut pas être modifiée ici."
          >
            <input
              id="profile-email"
              type="email"
              value={account.email}
              disabled
              className={inputClass}
            />
          </Field>

          <Field label="Méthode de connexion" htmlFor="profile-provider">
            <div
              id="profile-provider"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {account.provider === "credentials"
                ? "E-mail et mot de passe"
                : `Compte ${account.provider}`}
            </div>
          </Field>

          <div className="pt-1">
            <SubmitButton
              isLoading={isSaving}
              loadingLabel="Enregistrement…"
              disabled={!isDirty}
            >
              Enregistrer
            </SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
