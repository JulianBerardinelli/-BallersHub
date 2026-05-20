# Blog de 'BallersHub — sistema editorial gated

> **Status**: Diseño aprobado, MVP-1 en desarrollo (branch `claude/seo-blog`).
> **Owner**: @julian-berardinelli
> **Última actualización**: 2026-05-19

Este sistema permite que escritores invitados (bloggers whitelisted) submiteen artículos para review editorial. El admin (Julián) aprueba/rechaza antes de publicar. Los posts publicados alimentan SEO del dominio y dan link equity a los portfolios `/[slug]`.

Tres docs complementarios:
- [`contributor-guide.md`](./contributor-guide.md) — para escritores invitados
- [`admin-guide.md`](./admin-guide.md) — para Julián (review editorial)
- Este `README.md` — arquitectura técnica + setup

---

## 1. Objetivo del blog (recordatorio)

El blog **no es para vender**. Es palanca de SEO + E-E-A-T:

1. **Mid-funnel capture** — queries tipo `"cómo armar portfolio futbolista"` traen tráfico que después convierte a signup.
2. **Link equity flywheel** — cada post linkea ≥3 perfiles `/[slug]` reales. Google crawlea más seguido esos slugs.
3. **Domain Authority** — contenido editorial original genera backlinks naturales que suben todo el dominio.
4. **E-E-A-T anchor** — autores `Person` reales con `sameAs` a sus redes externas son señal de autoridad.
5. **AI search citations** — Perplexity / ChatGPT search / Google AI Overviews citan posts con datos originales.

Métrica de éxito: NO views del blog. Es **conversiones desde mid-funnel posts + crawl frequency aumentada en los portfolios linkeados** (GSC).

---

## 2. Roles y flow end-to-end

```
1. Admin marca usuario como "blogger" → flag is_blogger=true
2. Usuario blogger ve "Escribir artículo" en /blog (CTA gated)
3. Click → /blog/write con editor TipTap
4. Save draft → guardado en blog_posts.status='draft'
5. Submit → status='pending_review', email al admin (MVP-2)
6. Admin entra a /admin/blog/pending → review
7. Aprobado → status='published', published_at=now, aparece en /blog público + sitemap
8. Rechazado → status='rejected' + rejection_reason, autor lo ve en /blog/drafts
9. Autor edita un draft rechazado → re-submit → loop al paso 5
10. Una vez publicado: solo admin puede editar (autor lo ve read-only)
```

---

## 3. DB schema

### Tabla nueva: `blog_posts`

| Columna | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | uuid PK | no | `gen_random_uuid()` |
| `slug` | text UNIQUE | no | URL: `/blog/{slug}` — generado del title + ajustado por admin si colisiona |
| `title` | text | no | máx 120 chars en validation |
| `description` | text | no | meta description, máx 158 chars |
| `content_html` | text | no | output de TipTap (sanitized HTML) |
| `hero_image_url` | text | sí | OG image del post (1200x630 ideal) |
| `cluster` | text enum | no | `'career-guidance' \| 'agency-ops' \| 'industry-ar'` |
| `tags` | text[] | no | default `'{}'` |
| `author_user_id` | uuid → `user_profiles.user_id` | no | quién lo escribió |
| `status` | text enum | no | `'draft' \| 'pending_review' \| 'published' \| 'rejected'`, default `'draft'` |
| `rejection_reason` | text | sí | feedback del admin si `status='rejected'` |
| `reviewed_by_user_id` | uuid → `user_profiles.user_id` | sí | quién aprobó/rechazó |
| `reviewed_at` | timestamptz | sí | |
| `published_at` | timestamptz | sí | usado en sitemap `lastmod` |
| `reading_time_min` | int | no | auto-calculado al submit |
| `created_at` | timestamptz | no | default `now()` |
| `updated_at` | timestamptz | no | trigger `set_updated_at()` |

### Columna nueva en `user_profiles`

| Columna | Tipo | Default | Notas |
|---|---|---|---|
| `is_blogger` | boolean | `false` | flag de whitelist editorial |

### Índices

- `blog_posts_status_published_at_idx` on `(status, published_at DESC)` — listing público
- `blog_posts_author_user_id_idx` on `(author_user_id)` — drafts del autor
- `blog_posts_cluster_idx` on `(cluster, published_at DESC)` — hubs por cluster (MVP-3)
- `blog_posts_slug_idx` on `(slug)` — lookup por URL (ya UNIQUE)

### RLS policies

```sql
-- SELECT: público ve solo published
CREATE POLICY "blog_posts_public_select"
  ON blog_posts FOR SELECT
  USING (status = 'published');

-- SELECT: autor ve sus propios posts en cualquier estado
CREATE POLICY "blog_posts_author_select"
  ON blog_posts FOR SELECT
  USING (auth.uid() = author_user_id);

-- SELECT: admin ve todos
CREATE POLICY "blog_posts_admin_select"
  ON blog_posts FOR SELECT
  USING (is_admin());

-- INSERT: solo bloggers whitelisted
CREATE POLICY "blog_posts_blogger_insert"
  ON blog_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_blogger = true
    )
  );

-- UPDATE: autor solo en draft/rejected; admin siempre
CREATE POLICY "blog_posts_author_update"
  ON blog_posts FOR UPDATE
  USING (
    auth.uid() = author_user_id
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    auth.uid() = author_user_id
    AND status IN ('draft', 'pending_review')
  );

CREATE POLICY "blog_posts_admin_update"
  ON blog_posts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: solo admin (autor no borra, sí puede dejarlo en draft)
CREATE POLICY "blog_posts_admin_delete"
  ON blog_posts FOR DELETE
  USING (is_admin());
```

### Migration protocol

**Sigo el protocolo de [`feedback_migration_protocol.md`](../../memory/feedback_migration_protocol.md)**:

1. Edito `src/db/schema/blog.ts` (nuevo archivo)
2. Edito `src/db/schema/user-profiles.ts` para agregar `is_blogger`
3. Corro `npm run db:generate` — genera `src/db/migrations/000X_blog_posts.sql`
4. **Julián revisa el SQL** antes de aplicar
5. Aplico a `supabase-dev` (`avhctddkbcneugtqqxxk`) con `db:migrate` o MCP `apply_migration`
6. Test en preview de Vercel
7. Cuando mergeamos `dev → main`: Julián aplica a prod ANTES del merge git

NUNCA aplicar a prod desde agente sin autorización explícita.

---

## 4. Routing

| URL | Acceso | Función |
|---|---|---|
| `/blog` | público | listing paginado de posts published |
| `/blog/[slug]` | público | detail con Article JSON-LD |
| `/blog/write` | gated `is_blogger=true` | editor TipTap para nuevo post |
| `/blog/write/[id]` | gated owner | editor para editar draft existente |
| `/blog/drafts` | gated `is_blogger=true` | lista de mis posts (draft/pending/published/rejected) |
| `/blog/authors/[author-slug]` | público | author hub (MVP-2) |
| `/admin/blog` | gated `is_admin=true` | listado completo (todos los estados) |
| `/admin/blog/pending` | gated admin | queue de pending_review |
| `/admin/blog/[id]` | gated admin | detalle + accept/reject/edit |

---

## 5. File tree (MVP-1)

```
src/db/schema/
  blog.ts                                  ← nuevo schema Drizzle
  user-profiles.ts                         ← + is_blogger column

src/db/migrations/
  000X_blog_posts.sql                      ← generated by db:generate

src/app/(site)/blog/
  page.tsx                                 ← listing público
  [slug]/page.tsx                          ← detail con Article JSON-LD
  write/
    page.tsx                               ← nuevo post (gated is_blogger)
    [id]/page.tsx                          ← editar draft (gated owner)
    actions.ts                             ← server actions: createDraft, saveDraft, submitForReview
  drafts/
    page.tsx                               ← lista de mis posts

src/app/(dashboard)/admin/blog/
  page.tsx                                 ← listado completo
  pending/page.tsx                         ← queue pending_review
  [id]/page.tsx                            ← detail + accept/reject
  actions.ts                               ← server actions: approve, reject, unpublish, edit

src/lib/blog/
  posts.ts                                 ← queries DB (listing, by slug, by author)
  validation.ts                            ← zod schemas: createPostSchema, submitPostSchema
  slug.ts                                  ← slug generation + collision check
  reading-time.ts                          ← reading time estimate from HTML

src/lib/seo/
  articleJsonLd.tsx                        ← Article schema component

src/components/blog/
  RichTextEditor.tsx                       ← TipTap wrapper con toolbar
  BlogCard.tsx                             ← card del listing
  AuthorByline.tsx                         ← chip del autor en post
  StatusBadge.tsx                          ← chip de estado en dashboard
  RejectionReasonCard.tsx                  ← muestra feedback del admin al autor

src/lib/permissions/
  is-blogger.ts                            ← server helper: requireBlogger()

docs/blog/
  README.md                                ← este archivo
  contributor-guide.md
  admin-guide.md
```

---

## 6. Dependencies a instalar

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder
```

- `@tiptap/react` — wrapper React del editor
- `@tiptap/pm` — ProseMirror core
- `@tiptap/starter-kit` — bold, italic, h1-h6, list, blockquote, code, etc.
- `@tiptap/extension-link` — links con URL validation
- `@tiptap/extension-image` — image upload (hooked to existing media upload)
- `@tiptap/extension-placeholder` — placeholder "Empezá a escribir..."

YouTube embed + tabla + emoji se evalúan para MVP-3 si los pide algún autor.

---

## 7. SEO strategy (resumen, detalles en `docs/seo-strategy.md`)

### Clusters

| Cluster | Target audience | Ejemplos de posts |
|---|---|---|
| `career-guidance` | Jugadores | "Cómo armar un portfolio profesional", "Qué buscan los scouts en un perfil", "Estadísticas que importan según tu posición" |
| `agency-ops` | Agencias | "Gestión de roster: herramientas", "Cómo presentar jugadores a clubes" |
| `industry-ar` | Top-of-funnel AR | "Mercado de pases AFA 2026", "Categorías de ascenso argentino" |

### Article JSON-LD

```json
{
  "@type": "Article",
  "@id": "<base>/blog/<slug>#article",
  "headline": "...",
  "description": "...",
  "datePublished": "<published_at>",
  "dateModified": "<updated_at>",
  "author": { "@id": "<base>/blog/authors/<author-slug>#person" },
  "publisher": { "@id": "<base>#organization" },
  "mainEntityOfPage": "<base>/blog/<slug>",
  "image": "<hero_image_url>",
  "wordCount": 1547,
  "articleSection": "career-guidance",
  "inLanguage": "es-AR"
}
```

### Sitemap integration

Extender `src/app/sitemap.ts` con:

```ts
const blogPosts = await db
  .select({ slug, updatedAt: published_at })
  .from(blogPosts)
  .where(eq(blogPosts.status, 'published'));

const blogEntries = blogPosts.map(p => ({
  url: `${base}/blog/${p.slug}`,
  lastModified: p.updatedAt,
  changeFrequency: 'monthly',
  priority: 0.7,
}));
```

### Internal linking obligatorio

Cada post debe linkear ≥3 portfolios `/[slug]` reales. Esto se valida en el form al submitear (zod schema cuenta links a `${baseUrl}/...` distintos de `/blog/...`).

---

## 8. Cache + revalidación

- `/blog` listing → `revalidate: 3600` (1h)
- `/blog/[slug]` detail → `revalidate: 3600` + `revalidateTag('blog-post')` cuando se publica/edita
- Sitemap → `revalidate: 3600`

Cuando admin aprueba/edita/unpublish:
```ts
revalidatePath('/blog');
revalidatePath(`/blog/${slug}`);
revalidatePath('/sitemap.xml');
revalidatePath('/llms.txt');
```

---

## 9. Email notifications (MVP-2)

3 templates en `src/emails/templates/`:

- `blog-post-pending-admin.tsx` → cuando alguien submite, mail a Julián
- `blog-post-approved-author.tsx` → autor recibe link al post publicado
- `blog-post-rejected-author.tsx` → autor recibe rejection_reason + link a editar

---

## 10. Whitelist `is_blogger` — cómo invitar

**MVP-1 (manual via DB)**:
```sql
UPDATE user_profiles SET is_blogger = true WHERE user_id = '<uuid>';
```

**MVP-3 (UI)**: `/admin/users` con toggle "Marcar como blogger". No es prioridad ahora.

---

## 11. Out of scope (NO entra en MVP-1)

- Email notifications → MVP-2
- Author hubs `/blog/authors/[slug]` con `ProfilePage` JSON-LD → MVP-2
- Image upload integrado en TipTap (hero + inline) → MVP-2 (MVP-1 acepta solo hero image como input file separado)
- Cluster hubs `/blog/cluster/[slug]` → MVP-3
- YouTube/embeds en editor → MVP-3
- Comentarios/reacciones → no en roadmap
- UI de admin para togglear `is_blogger` → MVP-3 (manual via SQL hasta entonces)

---

## 12. Cómo validar después del merge

```bash
# 1) /blog devuelve 200 y muestra al menos posts seed
curl -s https://ballershub.co/blog | grep -c "<article"

# 2) Un post emite Article JSON-LD válido
curl -s https://ballershub.co/blog/<slug> | grep -A1 'application/ld+json' | head -3

# 3) Sitemap incluye blog posts
curl -s https://ballershub.co/sitemap.xml | grep "/blog/"

# 4) Rich Results Test sobre un post:
# https://search.google.com/test/rich-results
# Pegar: https://ballershub.co/blog/<slug>
# Esperado: Article schema válido + author Person resuelto
```
