import { db } from "@/lib/db";
import { agencyMedia } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import {
  getAgencyMediaTranslations,
  mergeAgencyMediaContent,
} from "@/lib/i18n/profile-content";
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

  // F5: stream module → applies its own locale translation. Defensive: empty
  // map if the migration is pending, so es base passes through.
  const locale = await getLocale();
  const trMap = await getAgencyMediaTranslations(
    rows.map((r) => r.id),
    locale,
  );

  const photos: GalleryPhoto[] = rows.map((r) => {
    const localized = mergeAgencyMediaContent(
      { title: r.title, altText: r.altText },
      trMap.get(r.id),
    );
    return {
      id: r.id,
      url: r.url,
      title: localized.title,
      altText: localized.altText,
    };
  });

  return <GalleryClient photos={photos} />;
}
