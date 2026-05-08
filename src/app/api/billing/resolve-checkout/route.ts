// Resolve a local checkout_sessions internal id from the processor's
// session id (Stripe checkout session id, MP preapproval id).
//
// Used by /checkout/processing when MP appends `?preapproval_id=...`
// to a back_url that didn't carry our `internal` param. We need a way
// to translate the MP id back to our row id so the polling loop can
// continue.
//
// Read-only, anonymous. Returns 404 if no matching session.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkoutSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const preapprovalId = params.get("preapproval_id");
  const stripeSessionId = params.get("cs_id");
  const processorId = preapprovalId ?? stripeSessionId;
  if (!processorId) {
    return NextResponse.json(
      { error: "Missing preapproval_id or cs_id" },
      { status: 400 },
    );
  }

  const processor = preapprovalId ? "mercado_pago" : "stripe";

  try {
    const [row] = await db
      .select({ id: checkoutSessions.id, status: checkoutSessions.status })
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.processor, processor),
          eq(checkoutSessions.processorSessionId, processorId),
        ),
      )
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "No checkout session found for that processor id" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      internal: row.id,
      status: row.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[billing/resolve-checkout] failed", {
      processorId,
      message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
