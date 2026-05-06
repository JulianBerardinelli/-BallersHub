// Manual reconcile endpoint. Pulls the latest state from the processor
// (Stripe / MP) and force-syncs the local checkout_sessions + subscriptions
// rows. Used as a self-healing fallback when webhooks miss.
//
// GET so it's easy to hit from a polling client; POST aliased for ergonomic
// curl usage. Both require an `internal` query param (the local session id).
//
// This route is intentionally side-effecting on read — it's a recovery
// endpoint, not a public API.

import { NextResponse, type NextRequest } from "next/server";
import { reconcileCheckout } from "@/lib/billing/reconcileCheckout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const internal = req.nextUrl.searchParams.get("internal");
  if (!internal) {
    return NextResponse.json({ error: "Missing `internal` query param" }, { status: 400 });
  }

  try {
    const result = await reconcileCheckout(internal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({
      status: result.status,
      refreshed: result.refreshed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[billing/reconcile-checkout] failed", { internal, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
