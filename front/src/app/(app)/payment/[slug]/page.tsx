import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { auth } from "../../../../auth";
import { hasPackAccess } from "../../../lib/entitlements";
import { isStripeConfigured } from "../../../lib/stripe";
import { formatPrice, getPackBySlug, localizedPack } from "../../packs/packsData";
import { getLang, getMessages } from "../../../i18n/server";
import CheckoutButton from "./CheckoutButton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).payment.title };
}

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, m, lang] = await Promise.all([params, getMessages(), getLang()]);
  const t = m.payment;
  const found = getPackBySlug(slug);

  if (!found) {
    return (
      <div className="bg-gray-50 min-h-screen px-4 py-12">
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow text-center">
          <h1 className="text-2xl font-bold text-gray-900">{m.workspace.notFoundTitle}</h1>
          <p className="text-gray-600 mt-2">{t.notFoundText}</p>
          <Link
            href="/nosPacks"
            className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700"
          >
            {m.workspace.backToPacks}
          </Link>
        </div>
      </div>
    );
  }

  const pack = localizedPack(m, found);

  // Paying twice for the same pack should not be possible.
  const session = await auth();
  if (session?.user?.id && (await hasPackAccess(session.user.id, pack.slug))) {
    redirect(`/packs/${pack.slug}`);
  }

  const price = formatPrice(pack.priceCents, lang);

  return (
    <div className="relative min-h-screen bg-white px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -start-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -end-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 border border-brand-200 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm">
            <ShieldCheck className="h-4 w-4" />
            {t.secure}
          </p>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            {t.heading}
          </h1>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">{t.bankDetails}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-6 items-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
            <p className="text-sm text-gray-500">{t.selected}</p>
            <h2 className="text-2xl font-semibold text-gray-900 mt-1">
              {pack.title}
            </h2>
            <p className="text-gray-600 mt-2">{pack.shortDescription}</p>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {t.content}
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
            <p className="text-sm text-gray-500">{t.summary}</p>
            <p className="mt-1 text-4xl font-bold text-gray-900">{price}</p>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>{t.subtotal}</span>
                <span>{price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.fees}</span>
                <span>{t.included}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>{t.total}</span>
                <span>{price}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
              {t.immediate}
            </div>

            <Link
              href="/nosPacks"
              className="inline-block mt-6 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
            >
              {m.workspace.backToPacks}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
