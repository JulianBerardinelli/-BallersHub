import { db } from "@/lib/db";
import { playerMedia } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import MediaGalleryScrolljack from "./MediaGalleryScrolljack";

export default async function MediaGalleryModule({ playerId, limits }: { playerId: string, limits?: Record<string, unknown> }) {
  // Fetch media asynchronously
  const maxPhotos = Number(limits?.max_photos ?? 100);
  const maxVideos = Number(limits?.max_videos ?? 100);

  const rawMedia = await db.select().from(playerMedia).where(and(eq(playerMedia.playerId, playerId), eq(playerMedia.isApproved, true)));
  
  const media = [
     ...rawMedia.filter(m => m.type === "photo").slice(0, maxPhotos),
     ...rawMedia.filter(m => m.type === "video").slice(0, maxVideos)
  ].map(m => ({
    id: m.id,
    url: m.url,
    title: m.title,
    altText: m.altText,
    type: m.type,
  }));

  if (media.length === 0) return null;

  return <MediaGalleryScrolljack media={media} />;
}
