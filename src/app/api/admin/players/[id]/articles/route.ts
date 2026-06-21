import { NextResponse } from "next/server";

import { ensureAdminActor } from "@/lib/admin/auth";
import { recordAdminPlayerAudit } from "@/lib/admin/notify";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";

// POST /api/admin/players/[id]/articles — admin adds a press note to a player.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: playerId } = await ctx.params;

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

    const { data: maxRow } = await admin
      .from("player_articles")
      .select("position")
      .eq("player_id", playerId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle<{ position: number }>();
    const nextPosition = (maxRow?.position ?? -1) + 1;

    const { data: inserted, error } = await admin
      .from("player_articles")
      .insert({
        player_id: playerId,
        title,
        url,
        image_url: imageUrl || null,
        publisher: publisher || null,
        published_at: publishedAt || null,
        position: nextPosition,
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await recordAdminPlayerAudit({
      actorId: auth.actor.actorId,
      actorIp: auth.actor.actorIp,
      playerId,
      domain: "prensa",
      action: "article.create",
    });
    await revalidatePlayerPublicProfileById(admin, playerId);

    return NextResponse.json({ article: inserted });
  } catch (error) {
    console.error("[admin articles] create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
