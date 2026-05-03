import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyUnsubscribeToken } from "@/lib/marketing/unsubscribe-token";
import { suppress } from "@/lib/marketing/suppression";

/**
 * Unsubscribe endpoint.
 *
 * Accepts POST (one-click via `List-Unsubscribe-Post: List-Unsubscribe=One-Click`)
 * AND GET (manual click from the email footer link → /unsubscribe?token=...).
 *
 * Both paths verify the HMAC token, mark the email as suppressed, and return
 * a 200. We never reveal whether the email was already suppressed (avoid
 * email enumeration).
 */

const tokenSchema = z.object({
  token: z.string().min(1),
});

async function handle(token: string) {
  let email: string;
  try {
    const verified = verifyUnsubscribeToken(token);
    email = verified.email;
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
  }

  await suppress(email, "user_request");
  return NextResponse.json({ ok: true, email });
}

export async function POST(req: Request) {
  // One-click unsubscribe (RFC 8058) sends `List-Unsubscribe=One-Click` as form-urlencoded.
  // We also accept JSON for our own UI.
  const contentType = req.headers.get("content-type") ?? "";
  let token: string | null = null;

  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      const parsed = tokenSchema.safeParse(body);
      if (parsed.success) token = parsed.data.token;
    } catch {
      // fall through
    }
  }

  // Form / one-click delivery
  if (!token) {
    try {
      const form = await req.formData();
      const t = form.get("token");
      if (typeof t === "string" && t.length > 0) token = t;
    } catch {
      // fall through
    }
  }

  // Some providers append the token as a query param even on POST
  if (!token) {
    const url = new URL(req.url);
    const t = url.searchParams.get("token");
    if (t) token = t;
  }

  if (!token) {
    return NextResponse.json({ error: "Falta el token." }, { status: 400 });
  }

  return handle(token);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Falta el token." }, { status: 400 });
  }
  return handle(token);
}
