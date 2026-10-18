/** Opens a Stripe Checkout session for one pack. */

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../auth";
import { getPackBySlug } from "../../(app)/packs/packsData";
import { hasPackAccess } from "../../lib/entitlements";
import { CGV_VERSION } from "../../lib/legalInfo";
import { isStripeConfigured, stripe } from "../../lib/stripe";

export const runtime = "nodejs";

async function publicOrigin(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/+$/, "");
  // Development fallback only.
  const headerList = await headers();
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${headerList.get("host") ?? "localhost:3000"}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  let body: { slug?: string; waiveWithdrawal?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  // The price always comes from the server-side catalogue — never from the
  // request — so a tampered payload cannot change what is charged.
  const pack = body.slug ? getPackBySlug(body.slug) : undefined;
  if (!pack) {
    return NextResponse.json({ error: "Pack inconnu." }, { status: 404 });
  }

  // Enforced here, not only by the disabled button: without the buyer's
  // express waiver, selling immediate access would leave a 14-day refund right
  // open (Code de la consommation, art. L221-28 13°).
  if (body.waiveWithdrawal !== true) {
    return NextResponse.json(
      {
        error:
          "Cochez la case de demande d’accès immédiat pour poursuivre le paiement.",
      },
      { status: 400 },
    );
  }

  if (await hasPackAccess(session.user.id, pack.slug)) {
    return NextResponse.json({ alreadyOwned: true, url: `/packs/${pack.slug}` });
  }

  // Checked after validating the request so a bad slug still gets a 404 on a
  // server without Stripe keys.
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json(
      { error: "Le paiement n’est pas configuré sur ce serveur." },
      { status: 503 },
    );
  }

  // Return URLs come from AUTH_URL, not from the request's Host header: a
  // forged Host must not be able to send buyers back to another site.
  const origin = await publicOrigin();

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: pack.priceCents,
            product_data: {
              name: pack.title,
              description: pack.shortDescription,
            },
          },
        },
      ],
      // Read back by the webhook — this is what ties the payment to an account.
      metadata: {
        userId: session.user.id,
        packSlug: pack.slug,
        // Proof of what the buyer agreed to, kept with the payment record.
        cgvVersion: CGV_VERSION,
        withdrawalWaivedAt: new Date().toISOString(),
      },
      success_url: `${origin}/packs/${pack.slug}?checkout=success`,
      cancel_url: `${origin}/nosPacks?checkout=cancelled`,
    });

    if (!checkout.url) {
      throw new Error("Stripe returned a session without a URL");
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[checkout] Stripe session creation failed", error);
    return NextResponse.json(
      { error: "Impossible d’ouvrir le paiement. Réessayez plus tard." },
      { status: 502 },
    );
  }
}
