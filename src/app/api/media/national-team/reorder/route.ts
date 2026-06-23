import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

// PATCH /api/media/national-team/reorder
// Body: { ids: string[] } — la lista ordenada completa de las fotos del bloque
// Selección Nacional del jugador. El nuevo `position` de cada id es su índice.
// Scopeado a player_id, así un id ajeno es un no-op inofensivo.
export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id, slug")
      .eq("user_id", user.id)
      .single<{ id: string; slug: string | null }>();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
      return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
    }
    if (ids.length === 0 || ids.length > 50) {
      return NextResponse.json({ error: "Invalid number of ids" }, { status: 400 });
    }

    const results = await Promise.all(
      (ids as string[]).map((id, index) =>
        supabase
          .from("national_team_media")
          .update({ position: index })
          .eq("id", id)
          .eq("player_id", profile.id),
      ),
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("Reorder national team media error:", failed.error);
      return NextResponse.json({ error: "Failed to reorder photos" }, { status: 500 });
    }

    revalidatePlayerPublicProfile(profile.slug ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder national team media error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
