import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coachPortfolioLeads, marketingSubscriptions, portfolioLeads } from "@/db/schema";
import { isSuppressed } from "@/lib/marketing/suppression";
import { sendLeadWelcomeEmail } from "@/lib/resend";

const PORTFOLIO_LEAD_COOKIE = "bh_lead_unlocked";
const COOKIE_MAX_AGE_DAYS = 60;

const bodySchema = z.object({
  email: z.string().email(),
  // Locale of the portfolio page (sent by the client) → localizes the lead
  // welcome email. Leads have no account, so there's no preferred_locale.
  locale: z.enum(["es", "en", "it", "pt"]).optional(),
  // Portfolio kind. Players and coaches can share a slug (different tables), so
  // the form tells us which profile type it's on ("coach" from /coach/<slug>).
  kind: z.enum(["player", "coach"]).optional(),
});

type Params = Promise<{ slug: string }>;

/** Fallback: parse the locale prefix from the referer (e.g. /pt/<slug>). */
function localeFromReferer(referer: string | null): "en" | "it" | "pt" | null {
  if (!referer) return null;
  try {
    const seg = new URL(referer).pathname.split("/").filter(Boolean)[0];
    return seg === "en" || seg === "it" || seg === "pt" ? seg : null;
  } catch {
    return null;
  }
}

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

  // The contact module is shared by player AND coach portfolios, which can share
  // a slug (different tables). The form sends `kind` ("coach" from /coach/<slug>)
  // so a coach lead is never mis-routed to a same-slug player. We resolve the
  // declared kind first and only fall back to the other type as a safety net.
  // `target.kind` then drives the lead table + the welcome email's portfolio path.
  const findPlayer = () =>
    db.query.playerProfiles.findFirst({
      where: (p, { and, eq }) =>
        and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
      columns: { id: true, fullName: true, slug: true },
    });
  const findCoach = () =>
    db.query.coachProfiles.findFirst({
      where: (c, { and, eq }) =>
        and(eq(c.slug, slug), eq(c.visibility, "public"), eq(c.status, "approved")),
      columns: { id: true, fullName: true, slug: true },
    });

  type Target =
    | { kind: "player"; id: string; fullName: string; slug: string }
    | { kind: "coach"; id: string; fullName: string; slug: string };
  let target: Target | null = null;

  if (parsed.data.kind === "coach") {
    const coach = await findCoach();
    if (coach) target = { kind: "coach", id: coach.id, fullName: coach.fullName, slug: coach.slug };
    if (!target) {
      const player = await findPlayer();
      if (player) target = { kind: "player", id: player.id, fullName: player.fullName, slug: player.slug };
    }
  } else {
    const player = await findPlayer();
    if (player) target = { kind: "player", id: player.id, fullName: player.fullName, slug: player.slug };
    if (!target) {
      const coach = await findCoach();
      if (coach) target = { kind: "coach", id: coach.id, fullName: coach.fullName, slug: coach.slug };
    }
  }

  if (!target) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const referrer = req.headers.get("referer");
  const userAgent = req.headers.get("user-agent");

  // 1) Always log the lead (historical / attribution) — coach leads land in
  //    their own `coach_portfolio_leads` table.
  if (target.kind === "coach") {
    await db.insert(coachPortfolioLeads).values({
      coachId: target.id,
      email,
      source: "contact_unlock",
      referrer: referrer ?? null,
      userAgent: userAgent ?? null,
    });
  } else {
    await db.insert(portfolioLeads).values({
      playerId: target.id,
      email,
      source: "contact_unlock",
      referrer: referrer ?? null,
      userAgent: userAgent ?? null,
    });
  }

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
      playerName: target.fullName ?? (target.kind === "coach" ? "el entrenador" : "el jugador"),
      playerSlug: target.slug ?? slug,
      // Coach portfolios live under /coach/<slug>; players at /<slug>.
      pathPrefix: target.kind === "coach" ? "coach" : undefined,
      // client-provided locale → referer prefix → es
      locale: parsed.data.locale ?? localeFromReferer(referrer) ?? "es",
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
