import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { playerMedia, careerItems, statsSeasons, playerHonours, teams, playerArticles } from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import LayoutResolver from "./components/LayoutResolver";

export const revalidate = 0; // DEVELOPMENT CACHE DISABLED
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) => and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
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
    with: {
      agency: true,
    }
  });

  if (!player) return notFound();

  // 2) Plan y límites (Para limitar fotos - o enviarlo completo y limitar ahi)
  const sub = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.userId, player.userId),
    columns: { plan: true, limitsJson: true }
  });
  const limits = (sub?.limitsJson ?? {}) as any;
  const maxPhotos = Number(limits?.max_photos ?? 100);
  const maxVideos = Number(limits?.max_videos ?? 100);

  // 3) Bandeja de Datos Públicos
  const [rawMedia, theme, sections, articles] = await Promise.all([
     db.select().from(playerMedia).where(and(eq(playerMedia.playerId, player.id), eq(playerMedia.isApproved, true))),
     db.query.profileThemeSettings.findFirst({ where: (t, { eq }) => eq(t.playerId, player.id) }),
     db.query.profileSectionsVisibility.findMany({ where: (s, { eq }) => eq(s.playerId, player.id) }),
     db.select().from(playerArticles).where(eq(playerArticles.playerId, player.id)).orderBy(desc(playerArticles.publishedAt))
  ]);

  const media = [
     ...rawMedia.filter(m => m.type === "photo").slice(0, maxPhotos),
     ...rawMedia.filter(m => m.type === "video").slice(0, maxVideos)
  ];

  const publicData = {
    player,
    career: [],
    media,
    sections,
    articles,
    theme: theme || { layout: "futuristic", primaryColor: "#171717", accentColor: "#3B82F6", typography: "syncopate" }
  };

  return <LayoutResolver data={publicData} />;
}
