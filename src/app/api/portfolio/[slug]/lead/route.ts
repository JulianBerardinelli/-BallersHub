import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { marketingSubscriptions, portfolioLeads } from "@/db/schema";
import { isSuppressed } from "@/lib/marketing/suppression";
import { sendLeadWelcomeEmail } from "@/lib/resend";

const PORTFOLIO_LEAD_COOKIE = "bh_lead_unlocked";
const COOKIE_MAX_AGE_DAYS = 60;

const bodySchema = z.object({
  email: z.string().email(),
});

type Params = Promise<{ slug: string }>;

/**
 * Lead capture endpoint for the portfolio contact module.
 *
 * Side effects (in order):
 *   1. Insert a `portfolio_leads` row (always — historical record).
 *   2. If the email is NOT suppressed, upsert into
 *      `marketing_subscriptions` with `consent_product=true` (the user
 *      explicitly opted in to "te avisamos de nuevos perfiles").
 *   3. Fire-and-forget: send the lead-welcome email. Failures here
 *      MUST NOT block the unlock flow — the cookie still gets set.
 *   4. Set the unlock cookie + return 200.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const { slug } = await params;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: { id: true, fullName: true, slug: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const referrer = req.headers.get("referer");
  const userAgent = req.headers.get("user-agent");

  // 1) Always log the lead (historical / attribution)
  await db.insert(portfolioLeads).values({
    playerId: player.id,
    email,
    source: "contact_unlock",
    referrer: referrer ?? null,
    userAgent: userAgent ?? null,
  });

  // 2) Add to marketing subscriptions (unless previously suppressed)
  const suppressed = await isSuppressed(email);
  if (!suppressed) {
    await db
      .insert(marketingSubscriptions)
      .values({
        email,
        source: "portfolio_lead",
        consentProduct: true,
      })
      .onConflictDoUpdate({
        target: marketingSubscriptions.email,
        set: {
          // If they leave their email a second time (different portfolio),
          // refresh consent + bump updated_at — but never silently flip
          // off other consent flags they may have toggled previously.
          consentProduct: true,
          updatedAt: sql`now()`,
        },
      });

    // 3) Fire-and-forget welcome email. Any error is logged but does
    //    not break the unlock flow.
    sendLeadWelcomeEmail({
      email,
      playerName: player.fullName ?? "el jugador",
      playerSlug: player.slug ?? slug,
    }).catch((error) => {
      console.error("[lead-route] sendLeadWelcomeEmail failed:", error);
    });
  }

  // 4) Set unlock cookie + respond
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: PORTFOLIO_LEAD_COOKIE,
    value: "1",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
  });

  return response;
}
