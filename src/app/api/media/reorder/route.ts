import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

// PATCH /api/media/reorder
// Body: { ids: string[] } — the full ordered list of the player's video
// highlights. Each id's new `position` is its index. Writes are scoped to
// type='video' so a stray photo id can never be reordered through here.
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
    if (ids.length === 0 || ids.length > 200) {
      return NextResponse.json({ error: "Invalid number of ids" }, { status: 400 });
    }

    // Persist each video's new position (its index). Scoped to player + video
    // so a foreign or photo id is a harmless no-op. Position isn't
    // unique-constrained, so these writes can run in parallel.
    const results = await Promise.all(
      (ids as string[]).map((id, index) =>
        supabase
          .from("player_media")
          .update({ position: index })
          .eq("id", id)
          .eq("player_id", profile.id)
          .eq("type", "video"),
      ),
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("Reorder media error:", failed.error);
      return NextResponse.json({ error: "Failed to reorder videos" }, { status: 500 });
    }

    revalidatePlayerPublicProfile(profile.slug);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Reorder media error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
