/**
 * Rate limiting — fixed-window counters stored in Postgres.
 *
 * Postgres rather than process memory: counters survive restarts and are
 * shared by every frontend instance, without adding Redis to the stack.
 *
 * Keys (IP addresses, e-mails) are stored as HMAC hashes, never in clear: a
 * counter only needs to tell two callers apart, not to know who they are.
 */

import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";

import { query } from "./db";

export type RateLimitRule = {
  /** Namespaces the counter, so rules never share a bucket. */
  name: string;
  limit: number;
  windowSeconds: number;
};

const HOUR = 60 * 60;

export const RATE_LIMITS = {
  /** Anonymous AI calls, per IP — the welcome chat needs only a handful. */
  aiAnonymous: { name: "ai-anon", limit: 30, windowSeconds: HOUR },
  /** Every anonymous AI call combined: caps the LLM bill against many IPs. */
  aiAnonymousGlobal: { name: "ai-anon-global", limit: 1000, windowSeconds: 24 * HOUR },
  /** Signed-in AI calls, per account. */
  aiUser: { name: "ai-user", limit: 200, windowSeconds: HOUR },
  register: { name: "register", limit: 5, windowSeconds: HOUR },
  /** Sign-in attempts, per IP: stops one source spraying many accounts. */
  loginIp: { name: "login-ip", limit: 20, windowSeconds: 15 * 60 },
  /**
   * Sign-in attempts, per address: stops many sources guessing one password.
   * The trade-off is that an attacker can lock an account out for one window.
   */
  loginEmail: { name: "login-email", limit: 10, windowSeconds: 15 * 60 },
  passwordChange: { name: "password-change", limit: 10, windowSeconds: 15 * 60 },
  /** Reset e-mails, per IP and per address: no mail-bombing a victim. */
  passwordResetIp: { name: "password-reset-ip", limit: 5, windowSeconds: HOUR },
  passwordResetEmail: { name: "password-reset-email", limit: 3, windowSeconds: HOUR },
  /** Token guesses, per IP — 256-bit tokens make this belt and braces. */
  passwordResetConfirm: { name: "password-reset-confirm", limit: 10, windowSeconds: 15 * 60 },
  leads: { name: "leads", limit: 5, windowSeconds: HOUR },
  /** Document uploads, per account: storage and future OCR both cost. */
  documentUpload: { name: "document-upload", limit: 60, windowSeconds: HOUR },
  /** Automated pre-checks, per account (OCR, when enabled, is billed per page). */
  documentAnalysis: { name: "document-analysis", limit: 60, windowSeconds: HOUR },
  /** "This result is wrong", per account: one account cannot skew the error rates. */
  precheckDispute: { name: "precheck-dispute", limit: 30, windowSeconds: HOUR },
} satisfies Record<string, RateLimitRule>;

/** Counters older than this are swept: longer than the longest window. */
const RETENTION_HOURS = 48;

const DDL = `
  CREATE SCHEMA IF NOT EXISTS ratelimit;

  CREATE TABLE IF NOT EXISTS ratelimit.counters (
    bucket       CHAR(64)    NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    hits         INTEGER     NOT NULL,
    PRIMARY KEY (bucket, window_start)
  );
`;

let schemaReady: Promise<void> | undefined;

function ensureSchema(): Promise<void> {
  schemaReady ??= query(DDL).then(() => undefined);
  return schemaReady;
}

function bucketFor(rule: RateLimitRule, key: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(`${rule.name}:${key}`)
    .digest("hex");
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Count one hit against `rule` for `key` and say whether it is allowed.
 *
 * Fails open: if the database cannot be reached the request goes through,
 * since blocking every visitor would be worse than a brief unlimited window.
 */
export async function hit(rule: RateLimitRule, key: string): Promise<RateLimitResult> {
  try {
    await ensureSchema();

    // Occasional sweep instead of a scheduler the frontend doesn't have.
    if (Math.random() < 0.01) {
      await query(
        `DELETE FROM ratelimit.counters
          WHERE window_start < now() - make_interval(hours => $1)`,
        [RETENTION_HOURS],
      );
    }

    const rows = await query<{ hits: number; retry_after: string }>(
      `INSERT INTO ratelimit.counters (bucket, window_start, hits)
            VALUES ($1, to_timestamp(floor(extract(epoch FROM now()) / $2) * $2), 1)
       ON CONFLICT (bucket, window_start)
              DO UPDATE SET hits = ratelimit.counters.hits + 1
         RETURNING hits,
                   ceil(extract(epoch FROM window_start + make_interval(secs => $2) - now()))
                     AS retry_after`,
      [bucketFor(rule, key), rule.windowSeconds],
    );

    const { hits, retry_after } = rows[0];
    return {
      allowed: hits <= rule.limit,
      retryAfterSeconds: Math.max(1, Number(retry_after)),
    };
  } catch (error) {
    console.error(`[rate-limit] ${rule.name} check failed, letting the request through`, error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Check rules in order, stopping at the first that blocks. Order matters: put
 * the narrowest rule first, so a caller already refused on its own quota
 * cannot keep draining a shared one (and lock everyone else out).
 */
export async function hitAll(
  checks: Array<[RateLimitRule, string]>,
): Promise<RateLimitResult> {
  for (const [rule, key] of checks) {
    const result = await hit(rule, key);
    if (!result.allowed) return result;
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * The caller's IP address.
 *
 * Takes the last `X-Forwarded-For` entry: the one written by the reverse proxy
 * in front of us, which a client cannot forge. This assumes exactly one proxy
 * (Caddy) and that port 3000 is not reachable directly — otherwise a client
 * could send its own header.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last || headers.get("x-real-ip") || "unknown";
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Trop de requêtes. Réessayez dans quelques minutes." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
