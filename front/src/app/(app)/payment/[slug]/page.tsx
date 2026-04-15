"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPackBySlug } from "../../packs/packsData";
import { isPackUnlocked, unlockPack } from "../../../lib/mockPayment";

export default function PaymentPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "";
  const [toast, setToast] = useState<string | null>(null);

  const pack = useMemo(() => getPackBySlug(slug), [slug]);

  useEffect(() => {
    if (!slug) return;
    if (isPackUnlocked(slug)) {
      router.push(`/packs/${slug}`);
    }
  }, [router, slug]);

  if (!pack) {
    return (
      <div className="bg-gray-50 min-h-screen px-4 py-12">
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow text-center">
          <h1 className="text-2xl font-bold text-gray-900">Pack introuvable</h1>
          <p className="text-gray-600 mt-2">
            Impossible de trouver ce pack. Retournez a la page des packs.
          </p>
          <Link
            href="/nosPacks"
            className="inline-block mt-6 bg-red-500 hover:bg-red-600 text-white py-3 px-5 rounded-lg"
          >
            Retour aux packs
          </Link>
        </div>
      </div>
    );
  }

  const handlePay = () => {
    unlockPack(slug);
    setToast("Paiement reussi ✅");

    window.setTimeout(() => {
      setToast(null);
    }, 3000);

    window.setTimeout(() => {
      router.push(`/packs/${slug}`);
    }, 700);
  };

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-12">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow z-50">
          {toast}
        </div>
      )}

      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-gray-900">Paiement du pack</h1>

        <div className="mt-6 space-y-2">
          <p className="text-sm text-gray-500">Titre pack</p>
          <p className="text-lg font-semibold text-gray-900">{pack.title}</p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500">Prix</p>
          <p className="text-3xl font-bold text-gray-900">{pack.price}</p>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500">Resume</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            {pack.description.slice(0, 4).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handlePay}
          className="mt-8 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg w-full"
        >
          Payer maintenant
        </button>
      </div>
    </div>
  );
}
