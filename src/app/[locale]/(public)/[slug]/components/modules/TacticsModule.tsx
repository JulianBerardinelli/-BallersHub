import { db } from "@/lib/db";
import { playerMedia } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import {
  getPlayerTranslation,
  mergePlayerContent,
  type PlayerLocalizedFields,
} from "@/lib/i18n/profile-content";
import ProfileTacticsModule from "./ProfileTacticsModule";

export default async function TacticsModule({ playerId }: { playerId: string }) {
  // Fetch player and media simultaneously. Order by the player's manual
  // position (set from the dashboard) so video highlights render in the
  // chosen order; createdAt is the tiebreaker for legacy rows (all at 0).
  const [player, media] = await Promise.all([
    db.query.playerProfiles.findFirst({
      where: (p, { eq }) => eq(p.id, playerId),
    }),
    db
      .select()
      .from(playerMedia)
      .where(and(eq(playerMedia.playerId, playerId), eq(playerMedia.isApproved, true)))
      .orderBy(asc(playerMedia.position), desc(playerMedia.createdAt))
  ]);

  if (!player) return null;

  // F5: this module streams its own data, so it must apply the active-locale
  // translation itself (the page-level merge doesn't reach here). The scouting
  // analysis + top characteristics render in the URL's language.
  const locale = await getLocale();
  const translation = await getPlayerTranslation(playerId, locale);
  const localizedPlayer = {
    ...player,
    ...mergePlayerContent(player as unknown as PlayerLocalizedFields, translation),
  };

  return (
    <div className="relative z-30 w-full">
      <ProfileTacticsModule player={localizedPlayer} media={media} />
    </div>
  );
}
