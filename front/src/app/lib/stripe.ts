/**
 * Stripe client.
 *
 * Deliberately nullable: the rest of the stack must still boot when no Stripe
 * key is configured (fresh clone, CI, `docker compose up` without secrets).
 * Callers check `isStripeConfigured()` and degrade gracefully.
 */

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey ? new Stripe(secretKey) : null;

export function isStripeConfigured(): boolean {
  return Boolean(secretKey);
}
