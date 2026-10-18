import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { auth } from "../../../../auth";
import { hasPackAccess } from "../../../lib/entitlements";
import { isStripeConfigured } from "../../../lib/stripe";
import { formatPrice, getPackBySlug } from "../../packs/packsData";
import CheckoutButton from "./CheckoutButton";

export const metadata: Metadata = {
  title: "Paiement",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = getPackBySlug(slug);

  if (!pack) {
    return (
      <div className="bg-gray-50 min-h-screen px-4 py-12">
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow text-center">
          <h1 className="text-2xl font-bold text-gray-900">Pack introuvable</h1>
          <p className="text-gray-600 mt-2">
            Impossible de trouver ce pack. Retournez à la page des packs.
          </p>
          <Link
            href="/nosPacks"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Retour aux packs
          </Link>
        </div>
      </div>
    );
  }

  // Paying twice for the same pack should not be possible.
  const session = await auth();
  if (session?.user?.id && (await hasPackAccess(session.user.id, pack.slug))) {
    redirect(`/packs/${pack.slug}`);
  }

  const price = formatPrice(pack.priceCents);

  return (
    <div className="relative min-h-screen bg-white px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -left-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm">
            <ShieldCheck className="h-4 w-4" />
            Paiement sécurisé par Stripe
          </p>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Finalisez votre commande
          </h1>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Vos coordonnées bancaires sont saisies directement chez Stripe et ne
            transitent jamais par nos serveurs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-6 items-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
            <p className="text-sm text-gray-500">Pack sélectionné</p>
            <h2 className="text-2xl font-semibold text-gray-900 mt-1">
              {pack.title}
            </h2>
            <p className="text-gray-600 mt-2">{pack.shortDescription}</p>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Contenu du pack
              </p>
              <ul className="mt-3 space-y-2">
                {pack.description.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-gray-700 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <CheckoutButton
              slug={pack.slug}
              stripeConfigured={isStripeConfigured()}
            />
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 md:p-7 shadow-sm">
            <p className="text-sm text-gray-500">Résumé de commande</p>
            <p className="mt-1 text-4xl font-bold text-gray-900">{price}</p>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Sous-total</span>
                <span>{price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frais de service</span>
                <span>Inclus</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{price}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              Accès au pack débloqué immédiatement après confirmation du
              paiement par Stripe.
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
