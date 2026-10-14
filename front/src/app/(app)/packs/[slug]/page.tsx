import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "../../../../auth";
import { hasPackAccess } from "../../../lib/entitlements";
import { getPackBySlug } from "../packsData";
import PackWorkspace from "./PackWorkspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: getPackBySlug(slug)?.title ?? "Pack" };
}

/**
 * Paywall for a pack.
 *
 * The check runs on the server against the entitlements written by the Stripe
 * webhook, so it cannot be bypassed from the browser the way the previous
 * localStorage flag could.
 */
export default async function PackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = getPackBySlug(slug);

  if (!pack) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Pack introuvable
          </h1>
          <p className="text-gray-600 mt-2">
            Le pack demandé n’existe pas ou n’est plus disponible.
          </p>
          <Link
            href="/nosPacks"
            className="inline-block mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Retour aux packs
          </Link>
        </div>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/packs/${pack.slug}`);
  }

  if (!(await hasPackAccess(session.user.id, pack.slug))) {
    redirect(`/payment/${pack.slug}`);
  }

  return <PackWorkspace />;
}
