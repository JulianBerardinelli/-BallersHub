import { NextResponse } from "next/server";

import { ensureAdminActor } from "@/lib/admin/auth";
import { recordAdminPlayerAudit } from "@/lib/admin/notify";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";

// PATCH /api/admin/players/[id]/media/reorder — body { ids: string[] }.
// Persists each video's new position (its index). Scoped to player + video.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: playerId } = await ctx.params;

    const auth = await ensureAdminActor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
    const admin = auth.actor.adminClient;

    const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
      return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
    }
    if (ids.length === 0 || ids.length > 200) {
      return NextResponse.json({ error: "Invalid number of ids" }, { status: 400 });
    }

    const results = await Promise.all(
      (ids as string[]).map((id, index) =>
        admin
          .from("player_media")
          .update({ position: index })
          .eq("id", id)
          .eq("player_id", playerId)
          .eq("type", "video"),
      ),
    );
    if (results.find((r) => r.error)) {
      return NextResponse.json({ error: "Failed to reorder videos" }, { status: 500 });
    }

    await recordAdminPlayerAudit({
      actorId: auth.actor.actorId,
      actorIp: auth.actor.actorIp,
      playerId,
      domain: "multimedia",
      action: "media.reorder",
    });
    await revalidatePlayerPublicProfileById(admin, playerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin media] reorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
