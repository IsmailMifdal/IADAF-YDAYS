/**
 * Stripe webhook — the only place that grants access to a pack.
 *
 * The browser is never trusted to report a successful payment: the redirect
 * back to `success_url` is cosmetic, and this endpoint is what actually writes
 * the entitlement.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getPackBySlug } from "../../../(app)/packs/packsData";
import { grantPackAccess } from "../../../lib/entitlements";
import { stripe } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("[stripe-webhook] Stripe is not configured — event dropped");
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente." }, { status: 400 });
  }

  // The signature is computed over the exact bytes Stripe sent, so the body has
  // to be read raw — parsing it as JSON first would break verification.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
    );
  } catch {
    // StripeSignatureVerificationError contains the raw payload and signature.
    // Neither belongs in logs, even when the request is malicious.
    console.error("[stripe-webhook] signature verification failed");
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    // Acknowledged and ignored — Stripe stops retrying on a 2xx.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    console.warn(
      `[stripe-webhook] session ${session.id} completed but unpaid (${session.payment_status})`,
    );
    return NextResponse.json({ received: true });
  }

  const userId = session.metadata?.userId;
  const packSlug = session.metadata?.packSlug;

  if (!userId || !packSlug || !getPackBySlug(packSlug)) {
    console.error(
      `[stripe-webhook] session ${session.id} has unusable metadata`,
    );
    // 200 on purpose: retrying will not repair bad metadata.
    return NextResponse.json({ received: true });
  }

  try {
    await grantPackAccess({
      userId,
      packSlug,
      amountCents: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
      stripeSessionId: session.id,
    });
    console.info(`[stripe-webhook] granted "${packSlug}" to user ${userId}`);
  } catch (error) {
    console.error("[stripe-webhook] could not persist entitlement", error);
    // 500 so Stripe retries — the payment succeeded, access must follow.
    return NextResponse.json({ error: "Persistance échouée." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
