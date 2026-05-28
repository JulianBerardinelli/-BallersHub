// Cross-reference helpers entre las dos Person entities que un mismo
// user puede tener en BallersHub:
//
//   1. Portfolio /<slug>           → Person como FUTBOLISTA
//   2. Author hub /blog/authors/<slug> → Person como AUTOR del blog
//
// Sin cross-reference explícito, Google ve 2 entidades Person con el
// mismo nombre pero distinto @id, lo que diluye autoridad. Estos
// helpers permiten que cada page agregue el sameAs[] correspondiente
// para que Google consolide la identidad en el Knowledge Graph.
//
// Caso típico: un jugador Pro que también escribe un par de posts
// estratégicos en el blog. Ambas Person entities deben apuntarse
// mutuamente. Caso edge: un blogger que no es jugador (ej. founder
// que escribe sobre BallersHub) — solo existe el author hub, no hay
// cross-ref hacia portfolio.

import { db } from "@/lib/db";
import { blogAuthors, playerProfiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Slug del author hub del user si existe row en blog_authors, null
 * si no. Usado por /<slug>/page.tsx para enriquecer el Person del
 * portfolio con sameAs hacia el author hub.
 */
export async function getAuthorHubSlugForUser(
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select({ slug: blogAuthors.slug })
    .from(blogAuthors)
    .where(eq(blogAuthors.userId, userId))
    .limit(1);
  return rows[0]?.slug ?? null;
}

/**
 * Slug del portfolio público del user si existe player_profile
 * APROBADO + PÚBLICO, null si no. Usado por
 * /blog/authors/<slug>/page.tsx para enriquecer el Person del author
 * hub con sameAs hacia el portfolio del jugador.
 *
 * El gate de approved + public es deliberado: no queremos linkear
 * desde un author hub público a un portfolio Free incompleto o un
 * profile que aún no pasó la revisión editorial — eso podría
 * confundir a Google sobre la calidad de la entidad cross-referenced.
 */
export async function getPortfolioSlugForUser(
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select({ slug: playerProfiles.slug })
    .from(playerProfiles)
    .where(
      and(
        eq(playerProfiles.userId, userId),
        eq(playerProfiles.status, "approved"),
        eq(playerProfiles.visibility, "public"),
      ),
    )
    .limit(1);
  return rows[0]?.slug ?? null;
}
