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

export default function DangerZoneSection({ account }: { account: Account }) {
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
        setError(data.error ?? "Impossible de supprimer le compte.");
        setIsDeleting(false);
        return;
      }

      // Le compte n'existe plus : la session doit disparaître avec lui.
      await signOut({ redirectTo: "/" });
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
      setIsDeleting(false);
    }
  }

  return (
    <SectionCard
      tone="danger"
      title="Supprimer le compte"
      description="Cette action est définitive et ne peut pas être annulée."
    >
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium">Ce qui sera supprimé :</p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-red-700">
          <li>Votre compte et vos informations personnelles</li>
          <li>Vos accès aux packs achetés, sans remboursement</li>
          <li>Votre historique de démarches et vos documents</li>
          <li>Vos conversations avec l’assistant IA</li>
          <li>Votre inscription à nos e-mails, si vous en aviez une</li>
        </ul>
      </div>

      {!isConfirming ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="rounded-xl border border-red-300 bg-white px-5 py-2.5 font-medium text-red-700 hover:bg-red-50 transition"
          >
            Supprimer mon compte
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Field
            label="Confirmez en saisissant votre adresse e-mail"
            htmlFor="confirm-email"
            hint={`Saisissez « ${account.email} » pour confirmer.`}
          >
            <input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={account.email}
              className={inputClass}
            />
          </Field>

          <div className="flex items-center gap-3">
            <SubmitButton
              type="button"
              tone="danger"
              isLoading={isDeleting}
              loadingLabel="Suppression…"
              disabled={!emailMatches}
              onClick={handleDelete}
            >
              Supprimer définitivement
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
              Annuler
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
