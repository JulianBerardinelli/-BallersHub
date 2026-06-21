import { NextResponse } from "next/server";

import { ensureAdminActor } from "@/lib/admin/auth";
import { recordAdminPlayerAudit } from "@/lib/admin/notify";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; articleId: string }> },
) {
  try {
    const { id: playerId, articleId } = await ctx.params;

    const auth = await ensureAdminActor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
    const admin = auth.actor.adminClient;

    const body = await req.json().catch(() => ({}));
    const { title, url, imageUrl, publisher, publishedAt } = body as {
      title?: string;
      url?: string;
      imageUrl?: string;
      publisher?: string;
      publishedAt?: string;
    };
    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from("player_articles")
      .update({
        title,
        url,
        image_url: imageUrl || null,
        publisher: publisher || null,
        published_at: publishedAt || null,
      })
      .eq("id", articleId)
      .eq("player_id", playerId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
    }

    await recordAdminPlayerAudit({
      actorId: auth.actor.actorId,
      actorIp: auth.actor.actorIp,
      playerId,
      domain: "prensa",
      action: "article.update",
    });
    await revalidatePlayerPublicProfileById(admin, playerId);

    return NextResponse.json({ success: true, article: updated });
  } catch (error) {
    console.error("[admin articles] update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; articleId: string }> },
) {
  try {
    const { id: playerId, articleId } = await ctx.params;

    const auth = await ensureAdminActor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
    const admin = auth.actor.adminClient;

    const { error } = await admin
      .from("player_articles")
      .delete()
      .eq("id", articleId)
      .eq("player_id", playerId);
    if (error) {
      return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
    }

    await recordAdminPlayerAudit({
      actorId: auth.actor.actorId,
      actorIp: auth.actor.actorIp,
      playerId,
      domain: "prensa",
      action: "article.delete",
    });
    await revalidatePlayerPublicProfileById(admin, playerId);

    return NextResponse.json({ success: true, deletedId: articleId });
  } catch (error) {
    console.error("[admin articles] delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
