// /llms.txt — AI crawler discoverability surface.
//
// Loose convention adopted by Perplexity, ChatGPT, and others: a
// plain-text manifest that lists the canonical content URLs and gives
// AI search engines an explicit entry point. Not standardized; we
// implement the most-recommended shape from `llmstxt.org`.
//
// Strategy for 'BallersHub: enumerate the SAME indexable players + approved
// agencies the sitemap submits (shared `indexable-profiles` predicate), so
// llms.txt never points AI crawlers at a thin Free profile whose own page
// marks it `noindex`. Group them under H2 sections so the LLM can scan the
// topical layout in seconds. Static marketing pages go at the top.
//
// Cached for an hour (`revalidate = 3600`) — AI crawlers re-fetch on a
// looser cadence than Googlebot and a fresh-by-the-minute file is
// wasted DB work.

import { db } from "@/lib/db";
import { blogPosts } from "@/db/schema/blog";
import { and, eq, desc } from "drizzle-orm";
import { getSiteBaseUrl } from "@/lib/seo/baseUrl";
import {
  getIndexablePlayers,
  getIndexableAgencies,
  getIndexableCoaches,
} from "@/lib/seo/indexable-profiles";
import { listAuthorsWithPublishedPosts } from "@/lib/blog/authors";

export const revalidate = 3600;

export async function GET() {
  const base = getSiteBaseUrl();

  let players: Array<{ slug: string; fullName: string }> = [];
  let agencies: Array<{ slug: string; name: string }> = [];
  let coaches: Array<{
    slug: string;
    fullName: string;
    roleTitle: string | null;
    currentClub: string | null;
  }> = [];
  let posts: Array<{ slug: string; title: string; description: string }> = [];
  let authors: Array<{ slug: string; displayName: string }> = [];

  try {
    [players, agencies, coaches, posts, authors] = await Promise.all([
      // Same indexable set as the sitemap + /players hub (shared predicate) —
      // never surface a thin Free profile that its own page marks `noindex`.
      getIndexablePlayers(),
      getIndexableAgencies(),
      getIndexableCoaches(),
      db
        .select({
          slug: blogPosts.slug,
          title: blogPosts.title,
          description: blogPosts.description,
        })
        .from(blogPosts)
        // Canonical LLM index = es only. Translations live under /<locale>/blog/<slug>
        // and would be redundant entries here.
        .where(and(eq(blogPosts.status, "published"), eq(blogPosts.locale, "es")))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(50),
      listAuthorsWithPublishedPosts(),
    ]);
  } catch (err) {
    console.error("[llms.txt] db query failed:", err);
  }

  const body = [
    "# 'BallersHub",
    "",
    "> Plataforma de portfolios profesionales para futbolistas, entrenadores (DTs) y agencias de representación. Perfiles verificados con trayectoria, estadísticas, licencias, palmarés y contacto.",
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
    "## Entrenadores",
    "",
    coaches.length > 0
      ? coaches
          .map(
            (c) =>
              `- [${c.fullName}](${base}/staff/${c.slug}): ${c.roleTitle || "Director Técnico"}${
                c.currentClub ? ` de ${c.currentClub}` : ""
              }`,
          )
          .join("\n")
      : "*(Sin entrenadores publicados todavía.)*",
    "",
    "## Blog",
    "",
    posts.length > 0
      ? posts
          .map((p) => `- [${p.title}](${base}/blog/${p.slug}): ${p.description}`)
          .join("\n")
      : "*(Sin artículos publicados todavía.)*",
    "",
    "## Autores",
    "",
    authors.length > 0
      ? authors
          .map(
            (a) =>
              `- [${a.displayName}](${base}/blog/authors/${a.slug}): Perfil editorial de ${a.displayName}`,
          )
          .join("\n")
      : "*(Sin autores con artículos todavía.)*",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
