import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import RosterClient from "./roster/RosterClient";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type Props = {
  agencyId: string;
  sections: AgencyPublicData["sections"];
};

export default async function AgencyRosterModule({ agencyId, sections }: Props) {
  const visible = sections.find((s) => s.section === "roster");
  if (visible && !visible.visible) return null;

  const players = await db
    .select({
      id: playerProfiles.id,
      slug: playerProfiles.slug,
      fullName: playerProfiles.fullName,
      avatarUrl: playerProfiles.avatarUrl,
      heroUrl: playerProfiles.heroUrl,
      positions: playerProfiles.positions,
      currentClub: playerProfiles.currentClub,
      nationality: playerProfiles.nationality,
      nationalityCodes: playerProfiles.nationalityCodes,
      marketValueEur: playerProfiles.marketValueEur,
    })
    .from(playerProfiles)
    .where(
      and(
        eq(playerProfiles.agencyId, agencyId),
        eq(playerProfiles.visibility, "public"),
        eq(playerProfiles.status, "approved"),
      ),
    );

  return <RosterClient players={players as any} />;
}
