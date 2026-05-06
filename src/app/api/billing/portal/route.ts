// Stripe Customer Portal launcher.
//
// POST: creates a billing portal session and returns the URL the client
// should navigate to. Auth-gated by Supabase session — only the owner of
// the subscription can launch the portal.
//
// Mercado Pago does not have a hosted customer portal; for ARS users we
// expose a custom UI in `/dashboard/settings/subscription` that calls
// `/api/billing/cancel`.

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";
import { billingEnv } from "@/lib/billing/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sub] = await db
    .select({
      processorCustomerId: subscriptions.processorCustomerId,
      processor: subscriptions.processor,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.processor, "stripe"),
        inArray(subscriptions.statusV2, [
          "trialing",
          "active",
          "past_due",
          "paused",
          "canceled",
        ]),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub?.processorCustomerId) {
    return NextResponse.json(
      { error: "No Stripe subscription found for this account." },
      { status: 404 },
    );
  }

  const baseUrl = billingEnv.appUrl();
  const returnUrlOverride = (await safeJson(req))?.return_url as
    | string
    | undefined;
  const returnUrl =
    returnUrlOverride && returnUrlOverride.startsWith("/")
      ? `${baseUrl}${returnUrlOverride}`
      : `${baseUrl}/dashboard/settings/subscription`;

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.processorCustomerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[billing/portal] failed", { userId: user.id, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function safeJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
