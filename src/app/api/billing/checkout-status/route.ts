// Light status endpoint used by /checkout/processing to poll until the
// webhook flips checkout_sessions.status to completed | failed | expired.
//
// We deliberately don't expose any other session fields — only the bare
// status — to minimise the surface area of an unauthenticated route.

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const internal = req.nextUrl.searchParams.get("internal");
  if (!internal) {
    return NextResponse.json({ status: "unknown" }, { status: 400 });
  }

  try {
    const [row] = await db
      .select({ status: checkoutSessions.status })
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, internal))
      .limit(1);

    if (!row) {
      return NextResponse.json({ status: "unknown" });
    }
    return NextResponse.json({ status: row.status });
  } catch (err) {
    console.warn("[billing/checkout-status] db error", err);
    return NextResponse.json({ status: "unknown" }, { status: 500 });
  }
}
