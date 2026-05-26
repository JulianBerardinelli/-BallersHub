// blog_authors — editorial author metadata, 1:1 con cada user_profiles
// whitelisted como blogger.
//
// Por qué tabla separada y no columnas en user_profiles:
//   - el slug público del autor (/blog/authors/<slug>) NO debe filtrarse
//     desde la identidad del user; bloggers pueden cambiar su display
//     name sin invalidar URLs históricas.
//   - separar evita poblar user_profiles con campos que solo aplican a
//     una minoría (los bloggers whitelisted).
//   - permite que admin edite metadata editorial sin tocar role/agency.
//
// Lifecycle:
//   - Admin crea la fila al whitelistear un user (o backfill via seed).
//   - El propio user puede editar bio / social URLs / avatar (no slug).
//   - El slug solo lo edita admin (cambio rompe URLs históricas → RLS
//     bloquea self_update sobre la columna slug).
//
// RLS policies viven en src/db/migrations/0003a_blog_authors_rls.sql
// porque Drizzle 0.36 todavía no soporta pgPolicy con WITH CHECK
// condicional sobre columnas — se quedan en archivo complementario hasta
// que migremos a declarativo (pendiente en project_drizzle_workflow.md).

import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const blogAuthors = pgTable(
  "blog_authors",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // 1:1 con el user que escribe — UNIQUE. Apunta a auth.uid() para
    // simplicidad de RLS (mismo patrón que blog_posts.author_user_id).
    userId: uuid("user_id").notNull(),

    // URL: /blog/authors/{slug}. UNIQUE. Generado de displayName al
    // crear; admin lo puede ajustar si colisiona.
    slug: text("slug").notNull(),

    // Nombre editorial — el que sale como byline ("Por X") y en JSON-LD
    // Person.name + Article.author.name.
    displayName: text("display_name").notNull(),

    // Tagline corto (ej. "Founder de 'BallersHub" o "Periodista deportivo")
    // → renderizado como headline debajo del nombre + meta description
    // del author hub si bio está vacía.
    headline: text("headline"),

    // Bio larga (≤ ~500 chars, enforced app-side). Renderizada en el
    // author hub + JSON-LD Person.description.
    bio: text("bio"),

    // URL del avatar (Supabase Storage o externo). Usado en author hub
    // header + Article author chip + JSON-LD Person.image.
    avatarUrl: text("avatar_url"),

    // External profile URLs — alimentan JSON-LD Person.sameAs[] que es
    // la pieza E-E-A-T más importante: cross-validation con perfiles
    // reales del autor que Google ya conoce.
    websiteUrl: text("website_url"),
    twitterUrl: text("twitter_url"),
    linkedinUrl: text("linkedin_url"),
    instagramUrl: text("instagram_url"),
    youtubeUrl: text("youtube_url"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    blogAuthorsSlugIdx: uniqueIndex("blog_authors_slug_idx").on(table.slug),
    blogAuthorsUserIdIdx: uniqueIndex("blog_authors_user_id_idx").on(
      table.userId,
    ),
  }),
);

export type BlogAuthor = InferSelectModel<typeof blogAuthors>;
export type NewBlogAuthor = InferInsertModel<typeof blogAuthors>;
