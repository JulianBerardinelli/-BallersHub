import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { playerMedia } from "@/db/schema";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "No slug" });

  const player = await db.query.playerProfiles.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
    with: {
      agency: true,
    }
  });

  if (!player) return NextResponse.json({ error: "No player" });

  const media = await db.select().from(playerMedia).where(eq(playerMedia.playerId, player.id));

  return NextResponse.json({
    player,
    media,
    playerKeys: Object.keys(player)
  });
}
