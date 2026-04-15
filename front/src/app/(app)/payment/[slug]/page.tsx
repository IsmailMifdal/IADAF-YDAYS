"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CreditCard, Lock, ShieldCheck } from "lucide-react";
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
    router.push(`/packs/${slug}`);
  };

  return (
    <div className="relative min-h-screen bg-white px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -left-24 h-80 w-80 rounded-full bg-cyan-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-rose-200/50 blur-3xl" />

      {toast && (
        <div className="fixed top-4 right-4 bg-white/95 border border-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow z-50 backdrop-blur">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 border border-cyan-300 bg-cyan-50 text-cyan-700 px-4 py-1.5 rounded-full text-sm">
            <ShieldCheck className="h-4 w-4" />
            Espace paiement securise
          </p>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Finalisez votre commande
          </h1>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Interface de paiement premium en mode demonstration. Aucun debit
            n&apos;est effectue sur cette page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-gray-500">Pack selectionne</p>
                <h2 className="text-2xl font-semibold text-gray-900 mt-1">
                  {pack.title}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">
                <Lock className="h-4 w-4" />
                Transaction chiffree TLS
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Nom sur la carte
                </label>
                <input
                  type="text"
                  placeholder="Ex: Amina Diallo"
                  className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Numero de carte
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 pl-10 pr-4 py-3 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  MM/YY
                </label>
                <input
                  type="text"
                  placeholder="08/29"
                  className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handlePay}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-semibold py-3.5 transition shadow-lg shadow-rose-300/50"
            >
              Payer maintenant (demo)
            </button>

            <p className="mt-3 text-xs text-gray-500">
              Cette action est volontairement non fonctionnelle pour la phase de
              design.
            </p>
          </section>

          <aside className="rounded-3xl border border-gray-200 bg-white p-6 md:p-7 shadow-xl">
            <p className="text-sm text-gray-500">Resume de commande</p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {pack.price}
            </p>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Contenu du pack
              </p>
              <ul className="mt-3 space-y-2">
                {pack.description.slice(0, 4).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-gray-700 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Sous-total</span>
                <span>{pack.price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frais de service</span>
                <span>Inclus</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{pack.price}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-cyan-800 text-xs">
              Paiement securise, recu instantane et acces immediat apres
              validation finale en production.
            </div>

            <Link
              href="/nosPacks"
              className="inline-block mt-6 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
            >
              Retour aux packs
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
