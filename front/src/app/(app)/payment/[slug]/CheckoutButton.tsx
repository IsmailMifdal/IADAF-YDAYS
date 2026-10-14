"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Lock } from "lucide-react";

type Props = {
  slug: string;
  stripeConfigured: boolean;
};

export default function CheckoutButton({ slug, stripeConfigured }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  // Code de la consommation, art. L221-28 13° : without this express request
  // and acknowledgement, the buyer keeps 14 days to withdraw and be refunded.
  // Unticked by default — a pre-ticked box is not consent.
  const [waivesWithdrawal, setWaivesWithdrawal] = useState(false);

  if (!stripeConfigured) {
    return (
      <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Le paiement n’est pas configuré sur ce serveur. Renseignez
        <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs">
          STRIPE_SECRET_KEY
        </code>
        pour activer la commande.
      </div>
    );
  }

  async function handleCheckout() {
    setError(null);
    setIsRedirecting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, waiveWithdrawal: waivesWithdrawal }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        setError(data.error ?? "Impossible d’ouvrir le paiement.");
        setIsRedirecting(false);
        return;
      }

      // Leaves the app for Stripe's hosted checkout — card details never touch
      // our servers, which is what keeps PCI scope out of this codebase.
      window.location.href = data.url;
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
      setIsRedirecting(false);
    }
  }

  return (
    <div className="mt-8">
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <label className="mb-4 flex items-start gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={waivesWithdrawal}
          onChange={(e) => setWaivesWithdrawal(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
        />
        <span>
          Je demande l’accès immédiat au pack et je reconnais perdre mon droit
          de rétractation de 14 jours. J’accepte les{" "}
          <Link href="/cgv" target="_blank" className="text-blue-600 underline">
            conditions générales de vente
          </Link>
          .
        </span>
      </label>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isRedirecting || !waivesWithdrawal}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 transition shadow-sm"
      >
        {isRedirecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
        {isRedirecting ? "Redirection…" : "Payer avec Stripe"}
      </button>

      <p className="mt-3 text-xs text-gray-500 text-center">
        Vous serez redirigé vers la page de paiement sécurisée de Stripe.
      </p>
    </div>
  );
}
