/** Account creation for the Credentials provider. */

import { NextResponse } from "next/server";

import { RATE_LIMITS, clientIp, hit, tooManyRequests } from "../../../lib/rateLimit";
import { createCredentialsUser } from "../../../lib/users";
import { registerSchema } from "../../../lib/validation";
import { getMessages, validationMessage } from "../../../i18n/server";

export async function POST(request: Request) {
  const m = await getMessages();
  const limit = await hit(RATE_LIMITS.register, clientIp(request.headers));
  if (!limit.allowed) return tooManyRequests(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.errors.invalidBody }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: validationMessage(m, parsed.error.issues[0]?.message) },
      { status: 400 },
    );
  }

  try {
    const user = await createCredentialsUser(parsed.data);

    // A null row means the ON CONFLICT clause fired — the address is taken.
    // The message stays deliberately vague so the endpoint cannot be used to
    // enumerate registered addresses.
    if (!user) {
      return NextResponse.json(
        { error: m.errors.registerFailed },
        { status: 409 },
      );
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    console.error("[register] account creation failed", error);
    return NextResponse.json(
      { error: m.errors.genericError },
      { status: 500 },
    );
  }
}
