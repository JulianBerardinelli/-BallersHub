import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerRoute } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getSupabaseEnv();
    const supa = await createSupabaseServerRoute();
    const { data: { user }, error } = await supa.auth.getUser();

    return NextResponse.json({
      ok: true,
      urlHost: new URL(env.url).host,
      anonKeyLen: env.anon.length,
      hasService: !!env.service,
      session: user ? "present" : "absent",
      authError: error?.message ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
