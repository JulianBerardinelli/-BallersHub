import { db } from "@/lib/db";
import { playerProfiles, playerMedia } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import ProfileTacticsModule from "./ProfileTacticsModule";

export default async function TacticsModule({ playerId }: { playerId: string }) {
  // Fetch player and media simultaneously
  const [player, media] = await Promise.all([
    db.query.playerProfiles.findFirst({
      where: (p, { eq }) => eq(p.id, playerId),
    }),
    db.select().from(playerMedia).where(and(eq(playerMedia.playerId, playerId), eq(playerMedia.isApproved, true)))
  ]);

  if (!player) return null;

  return (
    <div className="relative z-30 w-full">
      <ProfileTacticsModule player={player} media={media} />
    </div>
  );
}
