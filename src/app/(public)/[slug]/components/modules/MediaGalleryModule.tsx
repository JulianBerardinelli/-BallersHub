import { db } from "@/lib/db";
import { playerMedia } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function MediaGalleryModule({ playerId, limits }: { playerId: string, limits?: Record<string, unknown> }) {
  // Fetch media asynchronously
  const maxPhotos = Number(limits?.max_photos ?? 100);
  const maxVideos = Number(limits?.max_videos ?? 100);

  const rawMedia = await db.select().from(playerMedia).where(and(eq(playerMedia.playerId, playerId), eq(playerMedia.isApproved, true)));
  
  const media = [
     ...rawMedia.filter(m => m.type === "photo").slice(0, maxPhotos),
     ...rawMedia.filter(m => m.type === "video").slice(0, maxVideos)
  ];

  return (
    <section id="media" className="relative z-40 bg-transparent py-16 px-6 md:px-12 max-w-[1400px] w-full mx-auto">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10" />
      <div className="relative z-10 p-12">
        <h3 className="text-4xl font-heading font-black text-white">MEDIA HIGHLIGHTS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
           {media.length > 0 ? media.map((m) => (
             <div key={m.id} className="w-full aspect-square bg-white/10 rounded-2xl overflow-hidden border border-white/5">
                {m.type === 'photo' && <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${m.url})` }} />}
             </div>
           )) : <p className="text-white/30">Sin multimedia.</p>}
        </div>
      </div>
    </section>
  );
}
