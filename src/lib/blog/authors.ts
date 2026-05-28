// Author hub queries — backed by blog_authors table (MVP-2).
//
// Diseño:
//   - blog_authors es opcional para cada autor: solo los whitelisted +
//     con metadata seteada tienen row. Los posts pueden ser publicados
//     por admins (sin blog_authors row) y en ese caso usamos fallback.
//   - getAuthorBySlug devuelve null si no existe — la page de hub
//     emite 404 controlado.
//   - hydrateAuthors hace LEFT JOIN para que callers (ej. /blog/[slug])
//     reciban siempre algo (real o fallback).
//
// Estas queries corren con el rol de Drizzle (bypasses RLS), así que la
// autorización de escritura vive en server actions (no incluido en
// MVP-2 — el blog_authors hoy se gestiona via SQL del owner).

import { db } from "@/lib/db";
import { blogAuthors, userProfiles } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import type { BlogAuthor } from "@/db/schema";

export type HydratedAuthor = {
  userId: string;
  // null cuando el user no tiene blog_authors row — fallback path.
  blogAuthor: BlogAuthor | null;
  // role del user_profiles — sirve para el fallback display name.
  role: string;
};

/**
 * Devuelve la fila de blog_authors por slug público. null si no existe.
 */
export async function getAuthorBySlug(slug: string): Promise<BlogAuthor | null> {
  const rows = await db
    .select()
    .from(blogAuthors)
    .where(eq(blogAuthors.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Devuelve la fila de blog_authors por user_id. null si no existe.
 */
export async function getAuthorByUserId(
  userId: string,
): Promise<BlogAuthor | null> {
  const rows = await db
    .select()
    .from(blogAuthors)
    .where(eq(blogAuthors.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Hidrata una lista de userIds con su blog_authors row (si existe) +
 * role del user_profiles. Una sola query (LEFT JOIN) en vez de N+1.
 *
 * Usado por /blog/[slug]/page.tsx (author byline) y /blog (listing).
 */
export async function hydrateAuthors(
  userIds: string[],
): Promise<Map<string, HydratedAuthor>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({
      userId: userProfiles.userId,
      role: userProfiles.role,
      blogAuthor: blogAuthors,
    })
    .from(userProfiles)
    .leftJoin(blogAuthors, eq(blogAuthors.userId, userProfiles.userId))
    .where(inArray(userProfiles.userId, userIds));

  return new Map(
    rows.map((r) => [
      r.userId,
      {
        userId: r.userId,
        blogAuthor: r.blogAuthor,
        role: r.role,
      },
    ]),
  );
}

/**
 * Lista todos los authors que tengan al menos 1 post published.
 * Usado por sitemap.ts y llms.txt para indexar solo author hubs con
 * contenido real (un hub vacío es thin content que tanka quality).
 */
export async function listAuthorsWithPublishedPosts(): Promise<
  Array<Pick<BlogAuthor, "slug" | "displayName" | "updatedAt">>
> {
  // EXISTS subquery vs JOIN+DISTINCT: ambos son válidos en Postgres; EXISTS
  // se planea como semi-join y es marginalmente más legible.
  const rows = await db
    .select({
      slug: blogAuthors.slug,
      displayName: blogAuthors.displayName,
      updatedAt: blogAuthors.updatedAt,
    })
    .from(blogAuthors)
    .where(
      sql`EXISTS (
        SELECT 1 FROM blog_posts
        WHERE blog_posts.author_user_id = ${blogAuthors.userId}
          AND blog_posts.status = 'published'
      )`,
    );
  return rows;
}

/**
 * Helper: devuelve el array sameAs[] de un BlogAuthor row, descartando
 * URLs vacías o nulas. Usado por JSON-LD Person.sameAs y por el render
 * de íconos sociales en el author hub.
 */
export function authorSameAs(author: BlogAuthor): string[] {
  return [
    author.websiteUrl,
    author.twitterUrl,
    author.linkedinUrl,
    author.instagramUrl,
    author.youtubeUrl,
  ].filter((u): u is string => typeof u === "string" && u.length > 0);
}

/**
 * Fallback display name cuando un user no tiene blog_authors row.
 * Mantiene el comportamiento del MVP-1: admins se firman "Equipo
 * 'BallersHub" y el resto cae al genérico.
 */
export function fallbackDisplayName(role: string | undefined): string {
  return role === "admin" ? "Equipo 'BallersHub" : "Autor invitado";
}
