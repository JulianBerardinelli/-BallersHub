// /llms.txt — AI crawler discoverability surface.
//
// Loose convention adopted by Perplexity, ChatGPT, and others: a
// plain-text manifest that lists the canonical content URLs and gives
// AI search engines an explicit entry point. Not standardized; we
// implement the most-recommended shape from `llmstxt.org`.
//
// Strategy for 'BallersHub: enumerate all approved + public player and
// agency portfolios. Group them under H2 sections so the LLM can scan
// the topical layout in seconds. Static marketing pages go at the top.
//
// Cached for an hour (`revalidate = 3600`) — AI crawlers re-fetch on a
// looser cadence than Googlebot and a fresh-by-the-minute file is
// wasted DB work.

import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema/players";
import { agencyProfiles } from "@/db/schema/agencies";
import { blogPosts } from "@/db/schema/blog";
import { and, eq, desc } from "drizzle-orm";
import { getSiteBaseUrl } from "@/lib/seo/baseUrl";

export const revalidate = 3600;

export async function GET() {
  const base = getSiteBaseUrl();

  let players: Array<{ slug: string; fullName: string }> = [];
  let agencies: Array<{ slug: string; name: string }> = [];
  let posts: Array<{ slug: string; title: string; description: string }> = [];

  try {
    [players, agencies, posts] = await Promise.all([
      db
        .select({ slug: playerProfiles.slug, fullName: playerProfiles.fullName })
        .from(playerProfiles)
        .where(
          and(
            eq(playerProfiles.status, "approved"),
            eq(playerProfiles.visibility, "public"),
          ),
        ),
      db
        .select({ slug: agencyProfiles.slug, name: agencyProfiles.name })
        .from(agencyProfiles)
        .where(eq(agencyProfiles.isApproved, true)),
      db
        .select({
          slug: blogPosts.slug,
          title: blogPosts.title,
          description: blogPosts.description,
        })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(50),
    ]);
  } catch (err) {
    console.error("[llms.txt] db query failed:", err);
  }

  const body = [
    "# 'BallersHub",
    "",
    "> Plataforma de portfolios profesionales para futbolistas y agencias de representación. Perfiles verificados con trayectoria, estadísticas, galería oficial y contacto.",
    "",
    "## Información de la marca",
    "",
    `- [Inicio](${base}/): Página principal de 'BallersHub`,
    `- [Planes y precios](${base}/pricing): Comparativa Free vs Pro para jugadores y agencias`,
    `- [Sobre 'BallersHub](${base}/about): Misión, equipo y contacto`,
    `- [Blog](${base}/blog): Notas sobre carrera del jugador, operaciones de agencia e industria AR`,
    "",
    "## Jugadores",
    "",
    players.length > 0
      ? players
          .map((p) => `- [${p.fullName}](${base}/${p.slug}): Perfil profesional de ${p.fullName}`)
          .join("\n")
      : "*(Sin jugadores publicados todavía.)*",
    "",
    "## Agencias",
    "",
    agencies.length > 0
      ? agencies
          .map((a) => `- [${a.name}](${base}/agency/${a.slug}): Agencia de representación ${a.name}`)
          .join("\n")
      : "*(Sin agencias publicadas todavía.)*",
    "",
    "## Blog",
    "",
    posts.length > 0
      ? posts
          .map((p) => `- [${p.title}](${base}/blog/${p.slug}): ${p.description}`)
          .join("\n")
      : "*(Sin artículos publicados todavía.)*",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
