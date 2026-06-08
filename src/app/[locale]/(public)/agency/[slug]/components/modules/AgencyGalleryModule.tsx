import { db } from "@/lib/db";
import { agencyMedia } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import GalleryClient, { type GalleryPhoto } from "./gallery/GalleryClient";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type Props = {
  agencyId: string;
  sections: AgencyPublicData["sections"];
};

export default async function AgencyGalleryModule({ agencyId, sections }: Props) {
  const visible = sections.find((s) => s.section === "gallery");
  if (visible && !visible.visible) return null;

  const rows = await db
    .select()
    .from(agencyMedia)
    .where(eq(agencyMedia.agencyId, agencyId))
    .orderBy(asc(agencyMedia.position));

  if (rows.length === 0) return null;

  const photos: GalleryPhoto[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    altText: r.altText,
  }));

  return <GalleryClient photos={photos} />;
}
