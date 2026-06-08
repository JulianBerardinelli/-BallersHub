import { db } from "@/lib/db";
import { playerMedia } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import PortfolioGallery from "./gallery/PortfolioGallery";

const PRO_ASSET_PROVIDER_PREFIX = "pro_asset_";

type Props = {
  playerId: string;
  playerName: string;
  avatarUrl?: string | null;
  limits?: Record<string, unknown>;
};

export default async function MediaGalleryModule({ playerId, playerName, avatarUrl, limits }: Props) {
  const maxPhotos = Number(limits?.max_photos ?? 5);

  const rows = await db
    .select()
    .from(playerMedia)
    .where(and(eq(playerMedia.playerId, playerId), eq(playerMedia.isApproved, true)))
    .orderBy(asc(playerMedia.createdAt));

  const photos = rows
    .filter(
      (m) =>
        m.type === "photo" &&
        !(m.provider && m.provider.startsWith(PRO_ASSET_PROVIDER_PREFIX)) &&
        !(avatarUrl && m.url === avatarUrl)
    )
    .slice(0, maxPhotos)
    .map((m) => ({
      id: m.id,
      url: m.url,
      title: m.title,
      altText: m.altText,
    }));

  if (photos.length === 0) return null;

  return <PortfolioGallery photos={photos} playerName={playerName} />;
}
