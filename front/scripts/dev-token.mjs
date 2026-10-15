#!/usr/bin/env node
/**
 * Print an internal JWT, to call the gateway or a service by hand (curl,
 * Swagger) in development — the same token the frontend signs for each call.
 *
 *   INTERNAL_JWT_SECRET=... node scripts/dev-token.mjs            # anonymous
 *   INTERNAL_JWT_SECRET=... node scripts/dev-token.mjs <user-id>  # as a user
 *
 * Valid 60 seconds by default; pass a third argument for longer (seconds).
 * Never use the production secret on a workstation.
 */

import { SignJWT } from "jose";

const secret = process.env.INTERNAL_JWT_SECRET ?? "";
if (Buffer.byteLength(secret, "utf8") < 32) {
  console.error("INTERNAL_JWT_SECRET manquant ou trop court (32 octets minimum).");
  process.exit(1);
}

const [, , userId, ttl = "60"] = process.argv;

const jwt = new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer("iadaf-frontend")
  .setAudience("iadaf-backend")
  .setIssuedAt()
  .setExpirationTime(`${Number(ttl)}s`);
if (userId) jwt.setSubject(userId);

console.log(await jwt.sign(new TextEncoder().encode(secret)));
