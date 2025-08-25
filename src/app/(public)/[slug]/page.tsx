import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { playerProfiles, subscriptions, playerMedia, careerItems } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { formatMarketValueEUR } from "@/lib/format";

export const revalidate = 3600;
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) => and(eq(p.slug, slug), eq(p.visibility, "public" as any), eq(p.status, "approved" as any)),
    columns: { fullName: true, bio: true, positions: true, avatarUrl: true, },
  });
  if (!player) return { title: "Jugador no encontrado" };

  const title = player.fullName;
  const description = player.bio?.slice(0, 160) ?? `Perfil de ${player.fullName}${player.positions?.length ? ` — ${player.positions.join(", ")}` : ""}`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/${slug}`, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PlayerPublicPage({ params }: { params: Params }) {
  const { slug } = await params;

  // 1) Jugador público
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(
        eq(p.slug, slug),
        eq(p.visibility, "public"),
        eq(p.status, "approved"),
      ),
  });

  if (!player) return notFound();

  // 2) Plan y límites
  const sub = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.userId, player.userId),
    columns: { plan: true, limitsJson: true }
  });
  const plan = (sub?.plan ?? "free") as "free" | "pro" | "pro_plus";
  const limits = (sub?.limitsJson ?? {}) as any;
  const maxPhotos = Number(limits?.max_photos ?? 0);
  const maxVideos = Number(limits?.max_videos ?? 0);
  const statsEnabled = !!limits?.stats_by_year_enabled;

  // 3) Trayectoria
  const career = await db.select().from(careerItems)
    .where(eq(careerItems.playerId, player.id));

  // 4) Media (filtramos en JS para evitar enums en el WHERE)
  const media = await db.select().from(playerMedia)
    .where(eq(playerMedia.playerId, player.id));
  const photos = media.filter(m => m.type === "photo").slice(0, maxPhotos);
  const videos = media.filter(m => m.type === "video").slice(0, maxVideos);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header básico */}
      <section>
        <img
          src={player.avatarUrl || "/images/player-default.jpg"}
          alt={`Foto de ${player.fullName}`}
          className="size-24 rounded-xl object-cover ring-1 ring-neutral-200"
        />
        <h1 className="text-3xl font-bold">{player.fullName}</h1>
        {player.positions?.length ? (
          <p className="text-sm text-neutral-600">{player.positions.join(" · ")}</p>
        ) : null}
        {player.currentClub ? <p className="text-sm">Club actual: {player.currentClub}</p> : null}
        {player.bio ? <p className="mt-3">{player.bio}</p> : null}
        {player.marketValueEur != null && (
          <p className="text-sm">Valor de mercado: {formatMarketValueEUR(player.marketValueEur)}</p>
        )}

      </section>

      {/* Trayectoria */}
      {career.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Trayectoria</h2>
          <ul className="space-y-1">
            {career.map(c => (
              <li key={c.id}>
                <span className="font-medium">{c.club}</span>
                {c.division ? ` • ${c.division}` : ""}{" "}
                {c.startDate ? `(${c.startDate}${c.endDate ? `–${c.endDate}` : "–actual"})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Media con límites por plan */}
      {(videos.length > 0 || photos.length > 0) && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Media</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {videos.map(v => (
              <a key={v.id} href={v.url} target="_blank" className="underline">Ver video</a>
            ))}
            {photos.map(p => (
              <a key={p.id} href={p.url} target="_blank" className="underline">Ver foto</a>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">Plan: {plan}</p>
        </section>
      )}

    </main>
  );
}
