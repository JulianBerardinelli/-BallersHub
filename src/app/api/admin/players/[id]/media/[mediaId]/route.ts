import { NextResponse } from "next/server";

import { ensureAdminActor } from "@/lib/admin/auth";
import { recordAdminPlayerAudit } from "@/lib/admin/notify";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; mediaId: string }> },
) {
  try {
    const { id: playerId, mediaId } = await ctx.params;

    const auth = await ensureAdminActor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
    const admin = auth.actor.adminClient;

    const { data: mediaRecord } = await admin
      .from("player_media")
      .select("id, type, provider, url")
      .eq("id", mediaId)
      .eq("player_id", playerId)
      .maybeSingle<{ id: string; type: string; provider: string | null; url: string }>();
    if (!mediaRecord) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Remove the underlying object for locally-stored photos (best effort).
    if (
      !mediaRecord.provider &&
      mediaRecord.type === "photo" &&
      mediaRecord.url.includes("/storage/v1/object/public/player-media/")
    ) {
      try {
        const parts = mediaRecord.url.split("/storage/v1/object/public/player-media/");
        if (parts.length === 2) await admin.storage.from("player-media").remove([parts[1]]);
      } catch (storageError) {
        console.error("[admin media] storage delete (non-fatal):", storageError);
      }
    }

    const { error: deleteError } = await admin
      .from("player_media")
      .delete()
      .eq("id", mediaId)
      .eq("player_id", playerId);
    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
    }

    await recordAdminPlayerAudit({
      actorId: auth.actor.actorId,
      actorIp: auth.actor.actorIp,
      playerId,
      domain: "multimedia",
      action: "media.delete",
    });
    await revalidatePlayerPublicProfileById(admin, playerId);

    return NextResponse.json({ success: true, deletedId: mediaId });
  } catch (error) {
    console.error("[admin media] delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
