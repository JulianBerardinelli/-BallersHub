// src/app/api/admin/applications/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function doApprove(params: Params) {
  const { id } = await params;

  const supa = await createSupabaseServerRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Guardado extra en app (además del check SQL)
  const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supa.rpc("approve_player_application", { p_id: id });
  if (error) return NextResponse.json({ error: `rpc failed: ${error.message}` }, { status: 400 });

  return NextResponse.redirect(
    new URL("/admin/applications", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    { status: 303 }
  );
}

export async function POST(_req: Request, ctx: { params: Params }) { return doApprove(ctx.params); }
export async function GET(_req: Request, ctx: { params: Params }) { return doApprove(ctx.params); }
