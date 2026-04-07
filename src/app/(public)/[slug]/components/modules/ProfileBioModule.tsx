import { db } from "@/lib/db";
import { careerItems, teams } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import BioClientCard from "./BioClientCard";

export default async function ProfileBioModule({ playerId }: { playerId: string }) {
  // 1) Fetch detailed bio asynchronously
  const personalDetails = await db.query.playerPersonalDetails.findFirst({
    where: (p, { eq }) => eq(p.playerId, playerId),
  });

  // 2) Fetch standard bio traits missed in the layout
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { eq }) => eq(p.id, playerId),
    columns: { 
      fullName: true, 
      avatarUrl: true, 
      positions: true, 
      nationality: true,
      nationalityCodes: true, 
      bio: true,
      birthDate: true,
      heightCm: true,
      weightKg: true,
      currentClub: true,
      currentTeamId: true,
      foot: true,
      transfermarktUrl: true,
      beSoccerUrl: true
    }
  });

  // 3) Fetch Team crest and Career Division
  let crestUrl = null;
  if (player?.currentTeamId) {
     const t = await db.query.teams.findFirst({
        where: (t, { eq }) => eq(t.id, player.currentTeamId!)
     });
     if (t) crestUrl = t.crestUrl;
  }

  const latestCareer = await db.query.careerItems.findFirst({
     where: (c, { eq }) => eq(c.playerId, playerId),
     orderBy: [desc(careerItems.startDate)]
  });

  const socialLinks = await db.query.playerLinks.findMany({
     where: (l, { eq }) => eq(l.playerId, playerId)
  });

  return (
    <div className="relative w-full">
      {/* AMBIENT SPOTLIGHT BACKGROUND NEUTRAL */}
      <div className="absolute top-1/2 left-[70%] -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-white/[0.03] blur-[140px] rounded-full pointer-events-none mix-blend-screen" />
      
      <BioClientCard data={personalDetails} player={player || {}} teamCrest={crestUrl} division={latestCareer?.division || null} socialLinks={socialLinks} />
    </div>
  );
}
