"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { formatPrice, getPackBySlug, localizedPack } from "../../packs/packsData";
import { Alert, SectionCard, formatDate } from "../ui";
import { useLanguage } from "../../../context/LanguageContext";
import { fmt } from "../../../i18n";

type Purchase = {
  slug: string;
  title: string;
  amountCents: number;
  purchasedAt: string;
  reference: string | null;
};

export default function PurchasesSection() {
  const { lang, m } = useLanguage();
  const t = m.settings.purchases;
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/account/purchases")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? m.errors.purchasesLoadFailed);
          setPurchases([]);
          return;
        }
        setPurchases(data.purchases ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError(m.common.networkError);
          setPurchases([]);
        }
      });

    return () => {
      cancelled = true;
    };
    // Chargé une fois : un changement de langue ne recharge pas l'historique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (purchases === null) {
    return (
      <SectionCard title={t.title}>
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t.loading}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={t.title}
      description={t.description}
    >
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-900 font-medium">{t.emptyTitle}</p>
          <p className="text-sm text-gray-500 mt-1">
            {t.emptyText}
          </p>
          <Link
            href="/nosPacks"
            className="inline-block mt-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 font-medium transition"
          >
            {m.dashboard.discoverPacks}
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
                  {(() => {
                    const pack = getPackBySlug(purchase.slug);
                    return pack ? localizedPack(m, pack).title : purchase.title;
                  })()}
                </p>
                <p className="text-sm text-gray-500">
                  {fmt(t.boughtOn, { date: formatDate(purchase.purchasedAt, lang) })}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-semibold text-gray-900">
                  {formatPrice(purchase.amountCents, lang)}
                </span>
                <Link
                  href={`/packs/${purchase.slug}`}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {t.open}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
