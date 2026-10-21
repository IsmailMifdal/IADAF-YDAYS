"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { formatPrice } from "../../packs/packsData";
import { Alert, SectionCard, formatDate } from "../ui";

type Purchase = {
  slug: string;
  title: string;
  amountCents: number;
  purchasedAt: string;
  reference: string | null;
};

export default function PurchasesSection() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/account/purchases")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Impossible de charger vos achats.");
          setPurchases([]);
          return;
        }
        setPurchases(data.purchases ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Une erreur réseau est survenue.");
          setPurchases([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (purchases === null) {
    return (
      <SectionCard title="Mes achats">
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de vos achats…
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Mes achats"
      description="Historique des packs que vous avez achetés."
    >
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-900 font-medium">Aucun achat pour le moment</p>
          <p className="text-sm text-gray-500 mt-1">
            Les packs que vous achetez apparaîtront ici.
          </p>
          <Link
            href="/nosPacks"
            className="inline-block mt-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 font-medium transition"
          >
            Découvrir les packs
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {purchases.map((purchase) => (
            <li
              key={purchase.slug}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {purchase.title}
                </p>
                <p className="text-sm text-gray-500">
                  Acheté le {formatDate(purchase.purchasedAt)}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-semibold text-gray-900">
                  {formatPrice(purchase.amountCents)}
                </span>
                <Link
                  href={`/packs/${purchase.slug}`}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Ouvrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
