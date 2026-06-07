import { db } from "@/lib/db";
import { userProfiles, managerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import StaffClient, { type StaffMember } from "./staff/StaffClient";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type Props = {
  agencyId: string;
  sections: AgencyPublicData["sections"];
};

export default async function AgencyStaffModule({ agencyId, sections }: Props) {
  const visible = sections.find((s) => s.section === "staff");
  if (visible && !visible.visible) return null;

  const rows = await db
    .select({
      userProfileId: userProfiles.id,
      role: userProfiles.role,
      managerId: managerProfiles.id,
      fullName: managerProfiles.fullName,
      avatarUrl: managerProfiles.avatarUrl,
      bio: managerProfiles.bio,
      licenses: managerProfiles.licenses,
    })
    .from(userProfiles)
    .leftJoin(managerProfiles, eq(managerProfiles.userId, userProfiles.id))
    .where(eq(userProfiles.agencyId, agencyId));

  const staff: StaffMember[] = rows
    .filter((r) => r.fullName)
    .map((r) => ({
      id: r.managerId ?? r.userProfileId,
      fullName: r.fullName as string,
      avatarUrl: r.avatarUrl,
      bio: r.bio,
      role: r.role,
      licenses: (r.licenses ?? []) as Array<{ type: string; number: string; url?: string }>,
    }));

  if (staff.length === 0) return null;

  return <StaffClient staff={staff} />;
}
