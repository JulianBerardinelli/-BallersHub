# Blog de 'BallersHub — sistema editorial gated

> **Status**: ✅ **MVP-1 deployed a prod**. Live en <https://ballershub.co/blog>.
> **Owner**: @julian-berardinelli
> **Última actualización**: 2026-05-21
> **PRs deployed**: #84 (MVP-1), #85 (fix imagen + UX rechazar), #87 (sync drift histórico), #90 (fix definitivo unaccent qualified).

Este sistema permite que escritores invitados (bloggers whitelisted) submiteen artículos para review editorial. El admin (Julián) aprueba/rechaza antes de publicar. Los posts publicados alimentan SEO del dominio y dan link equity a los portfolios `/[slug]`.

## Documentación relacionada

**Docs del blog (este folder):**
- [`contributor-guide.md`](./contributor-guide.md) — manual operativo para escritores invitados (cómo usar el editor)
- [`blogger-seo-guide.md`](./blogger-seo-guide.md) — **guía de calidad y SEO para enviar a los bloggers** (SEO strategy + E-E-A-T + criterios del audit + reglas de marca). Enviable tal cual a un escritor nuevo.
- [`admin-guide.md`](./admin-guide.md) — playbook para Julián (review editorial)
- Este `README.md` — arquitectura técnica + setup + bugs conocidos + roadmap MVP-2

**Docs de SEO (contexto cruzado, leer para entender por qué existe el blog):**
- [`../seo-strategy.md`](../seo-strategy.md) — la estrategia SEO completa. El blog es **Phase 2 Track B** de ese plan.
- [`../seo-per-player-handoff.md`](../seo-per-player-handoff.md) — implementación SEO de los portfolios `/[slug]` (Phase 1). El blog los alimenta con link equity.

**Memory (contexto histórico):**
- `memory/project_blog_mvp1_live.md` — state post-deploy + bugs conocidos + roadmap
- `memory/project_seo_per_player.md` — bloque SEO que precedió al blog
- `memory/feedback_migration_protocol.md` — reglas DB post-incidente (leer antes de tocar schema)

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

## 1.5. Rol del blog en la estrategia SEO

El blog es **Phase 2 Track B** del [`seo-strategy.md`](../seo-strategy.md). Encaja en la estrategia general así:

### Mapa de phases del SEO general

| Phase | Track | Implementación | Status |
|---|---|---|---|
| **Phase 1 — Foundation** | Sitewide: Organization + WebSite + SoftwareApplication. Per-player: Person JSON-LD + dynamic OG. Per-agency: SportsOrganization. Pricing: Offer schema. `/about`: AboutPage + team Person | [`seo-per-player-handoff.md`](../seo-per-player-handoff.md), `src/lib/seo/*` | ✅ deployed (PRs #63, #82) |
| **Phase 2 — E-E-A-T + content** | Track A (marketing pages estáticas), **Track B (este blog)**, Track C (portfolio quality enforcement) | Track A: hecho. Track B: **este blog** (PRs #84/#85). Track C: soft-noindex Free <100 chars (PR #82) | ✅ deployed |
| **Phase 3 — Directory hubs** | `/jugadores/por-club|posicion|pais` con CollectionPage + ItemList | Gated por ≥200 Pro profiles aprobados | ⏳ pending |
| **Phase 4 — Authority + AI search** | Backlink outreach (Olé, Infobae, TyC Sports), `/sitemap-index.xml` split, hreflang `/en/[slug]`, AI Overviews monitoring | — | ⏳ pending |

### Qué SEO references el blog específicamente

| Pieza del blog | Pieza del SEO strategy que cubre |
|---|---|
| `Article` JSON-LD con `headline`/`datePublished`/`dateModified`/`articleSection` | §6 Schema plan: `/blog/[post]` → `Article` + author `Person` link |
| `BreadcrumbList` (Inicio → Blog → cluster → post) | §6 Schema plan: BreadcrumbList per page-type |
| Author Person con `@id` cruzando a `/blog/authors/[slug]#person` | §5 Track B objetivo 4 (E-E-A-T amplifier) |
| `≥3 links a /[slug]` reales (validation enforced) | §5 Track B objetivo 2 (link-equity flywheel) — la primera palanca de crawl frequency boost a Pro portfolios |
| Sitemap entry para cada published post | §7 Required technical foundation (sitemap.ts extensión) |
| llms.txt sección `## Blog` | §7 + §1.5 (AI-search readiness) |
| `≥1500 palabras` enforced at submit | §5 Track B cadence target (long-form content) |
| Cluster enum `career_guidance / agency_ops / industry_ar` | §5 Track B cluster topics literal |
| Editorial gate (admin review antes de publish) | §10 anti-cargo-cult — evita thin programmatic pages que tankan quality score |

### Cómo el blog ALIMENTA al SEO de los portfolios `/[slug]`

```
Post publicado en /blog/[slug]
  → contenido con ≥3 links a /julian-berardinelli, /lucia-gomez, /santiago-perez
  → Google crawler visita /blog/[slug] (sitemap + llms.txt + GSC submission)
  → sigue los links a /[slug] portfolios
  → INCREMENTA crawl frequency en esos portfolios (medible en GSC Crawl Stats)
  → Los portfolios suben de posición en SERP para su own-name query
  → Métrica primaria del SEO strategy: "Pro players winning their own name SERP" sube
```

Sin el blog, los portfolios solo reciben crawl desde el sitemap. Con el blog, **cada post nuevo es un nuevo path para que Google descubra y refresque** los portfolios linkeados. Por eso la validation enforce `≥3 links a /[slug]` no es arbitraria — es la métrica que conecta blog → portfolios → ranking.

### Anti-patterns que el blog evita

Del §10 "What to skip" del SEO strategy:

- ❌ `FAQ schema` en posts: Google removió rich results para sitios comerciales (Aug 2023). El blog NO usa FAQ schema.
- ❌ `Review` schema: no somos un review site, fabrication risk.
- ❌ `HowTo` schema: deprecated por Google (Sept 2023). Los posts usan `Article` schema regular.
- ❌ Programmatic / thin content: el editorial gate del admin (≥1500 palabras + ≥3 H2 + ≥3 links + hero image + cluster) bloquea posts thin que tankan quality score.

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

## 11. Out of scope (NO entra en MVP-1) y status de MVP-2

| Item | Status |
|---|---|
| **Email notifications (Resend) → admin pending + author approve/reject** | ✅ **MVP-2 implementado** (ver §11.3 abajo) |
| **Author hubs `/blog/authors/[slug]` con `ProfilePage` JSON-LD + sameAs** | ✅ **MVP-2 implementado** (ver §11.1 abajo) |
| **Image upload integrado en TipTap (hero + inline) → Supabase Storage** | ✅ **MVP-2 implementado** (ver §11.2 abajo) |
| UI admin toggle `is_blogger` | ⏳ MVP-3 (manual via SQL hasta entonces) |
| Cluster hubs `/blog/cluster/[slug]` | ⏳ MVP-3 |
| YouTube/embeds en editor | ⏳ MVP-3 |
| Comentarios/reacciones | ❌ no en roadmap |

### 11.1. Author hubs (MVP-2 item #1)

**Estado**: ✅ deployed en prod (PR #101 merged a `main` el 2026-05-26). Schema + seed aplicados a dev (`ciolizjshimyvyonlssq`) y prod (`erdvpcfjynkhcrqktozd`), hash registrado en `drizzle.__drizzle_migrations` id=4.

**Modelo**: nueva tabla `blog_authors` (1:1 con `user_profiles` whitelisted). Columnas: `slug`, `display_name`, `headline`, `bio`, `avatar_url`, `website_url`, `twitter_url`, `linkedin_url`, `instagram_url`, `youtube_url`. RLS: public select libre + admin all + self update + **trigger `blog_authors_protect_slug` que bloquea cambio de slug por non-admins** (fix del Codex P1 review — slug es URL pública e immutable salvo admin).

**Migration files**:
- `src/db/migrations/0006_sweet_preak.sql` (Drizzle tracked) — CREATE TABLE + 2 UNIQUE indexes
- `src/db/migrations/0006a_blog_authors_rls.sql` (complementario manual) — enable RLS + trigger updated_at + 3 policies + GRANTs + trigger protect_slug
- `src/db/migrations/0006b_blog_authors_seed_owner.sql` (complementario manual) — seed idempotente del row del owner (tolerante a `auth.users` vacío en dev schema-only)

**Ruta nueva**: `/blog/authors/[slug]` → `src/app/(site)/blog/authors/[slug]/page.tsx`
- Header con avatar + display_name + headline + bio + social icons
- Grid de posts published del autor (reusa `BlogCard`)
- 404 si el slug no resuelve

**JSON-LD nuevo**: `ProfilePage` + `Person` + `BreadcrumbList` (graph) — `src/lib/seo/profilePageJsonLd.tsx`
- `Person.@id` matchea el `author.@id` que Article schema emite desde `/blog/[slug]` → cierra el dangling cross-reference de MVP-1.
- `Person.sameAs[]` alimentado por las social URLs del autor → E-E-A-T amplifier.

**Byline en `/blog/[slug]`**: cuando hay `blog_authors` row, el nombre del autor es un `<Link>` al hub. Sin row, fallback al texto plano "Equipo 'BallersHub" o "Autor invitado" (mismo comportamiento MVP-1).

**Sitemap + llms.txt**: `listAuthorsWithPublishedPosts()` filtra a authors con ≥1 post published (anti thin-content). Sitemap priority 0.6, changeFrequency monthly. llms.txt sección `## Autores`.

### 11.2. Image upload integrado (MVP-2 item #3)

**Estado**: ✅ deployed contra branch `claude/blog-mvp2-image-upload`.

**Modelo**: bucket nuevo `blog-media` (Supabase Storage, público, 5MB cap, JPEG/PNG/WebP/AVIF). Path convention `{user_id}/{uuid}.avif` — todo se transcodea a AVIF q60 server-side via `sharp` (mismo preset que `/api/media/upload` para player media). RLS storage.objects: SELECT público, INSERT bloggers/admin con foldername match, UPDATE/DELETE owner+admin.

**Migration file**:
- `src/db/migrations/0006c_blog_media_bucket.sql` (complementario manual) — INSERT bucket + 4 storage policies. Idempotente (ON CONFLICT DO UPDATE).

**API route**: `/api/blog/media/upload` (`src/app/api/blog/media/upload/route.ts`)
- POST con FormData (`file` field)
- `requireBlogger()` check app-side (defense-in-depth sobre la RLS del bucket)
- Sharp transcode → AVIF q60 (excepto AVIF passthrough)
- Upload a bucket con `cacheControl: 31536000` (1 año, UUID en nombre = immutable)
- Devuelve `{ url, path }`

**UI changes**:
- `RichTextEditor`: el botón de imagen ahora abre file picker (no más `window.prompt` URL). Loading state durante upload, error alert si falla.
- `BlogPostForm`: el hero image input es file picker + preview con botones "Cambiar" / "Quitar". Loading state inline, error message en el field.
- `BlogCard`, `blog/[slug]/page.tsx`, `blog/authors/[slug]/page.tsx`: migrados de `<img>` plain a `next/image` con `unoptimized={!url.includes(".supabase.co")}` fallback para posts MVP-1 con URLs externas.

**Out of scope (MVP-3+)**:
- Image cropping / aspect ratio enforce (autor sube tamaño libre)
- Galería de imágenes previas del autor (sin tabla `blog_media` separada por ahora — el bucket es la fuente de la verdad)
- Garbage collection de imágenes huérfanas (sin post asociado) — cleanup manual via admin

### 11.3. Email notifications (MVP-2 item #2)

**Estado**: ✅ implementado contra branch `claude/blog-mvp2-emails`.

**Stack reutilizado**: el repo ya tiene infraestructura Resend madura (11 templates existentes + registry + design system de componentes en `src/emails/`). Este item solo agrega 3 templates + 3 send functions + wireup en las server actions.

**Templates nuevos** (todos transactional, no incluyen unsubscribe — son notificaciones del flow editorial, no marketing):

| Template key | Trigger | Destinatario | Subject |
|---|---|---|---|
| `blog_post_pending_admin` | Blogger submitea (`submitForReview`) | TODOS los admins (`role='admin'`) | `Blog — Post nuevo en revisión: {title}` |
| `blog_post_approved_author` | Admin aprueba (`reviewPost decision=approve`) | El autor del post | `Publicamos tu artículo: {title}` |
| `blog_post_rejected_author` | Admin rechaza (`reviewPost decision=reject`) | El autor del post | `Feedback editorial sobre tu artículo` |

**Helper nuevo**: `src/lib/blog/email-recipients.ts`
- `getBlogAdminEmails()` — SQL raw join `user_profiles` × `auth.users` para todos los admins. Dinámico (multi-admin friendly).
- `getAuthorEmailById(userId)` — lookup del email del autor por user_id.

**Send functions nuevas** (en `src/lib/resend.ts`):
- `sendBlogPostPendingAdminEmail({ adminEmails, authorName, authorEmail, postId, postTitle, clusterLabel, readingTimeMin })`
- `sendBlogPostApprovedAuthorEmail({ authorEmail, authorName, postTitle, postSlug, clusterLabel, authorSlug? })`
- `sendBlogPostRejectedAuthorEmail({ authorEmail, authorName, postId, postTitle, rejectionReason })`

Mismo patrón que el resto: si `RESEND_API_KEY` no está, hace mock log; si falla el send, captura el error con `console.error` para no romper el flow padre.

**Wireup en server actions**:
- `src/app/(site)/blog/write/actions.ts → submitForReview`: después del UPDATE `status='pending_review'`, envía mail al admin con título + autor + link a `/admin/blog/[id]`. Try/catch decoupled del flow principal (si el email falla, el submit no falla).
- `src/app/(dashboard)/admin/blog/actions.ts → reviewPost`: después del UPDATE, según `decision === 'approve' | 'reject'`, envía mail al autor con el template correspondiente. Mismo try/catch decoupled.

**Preview en admin marketing UI**: los 3 templates están agregados al `buildSampleProps` switch en `src/app/(dashboard)/admin/marketing/actions.ts` con sample data realista, así el admin puede previsualizar el render desde `/admin/marketing` antes de habilitarlos en prod.

**Validar después del merge**:
```bash
# 1) Como blogger, ir a /blog/write, submitear un draft válido.
#    Esperado: email a julian.berardinelli@gmail.com con título + link a /admin/blog/[id]

# 2) Como admin, aprobar el post en /admin/blog/[id]
#    Esperado: email al autor con link al post publicado + su author hub

# 3) Repetir con reject + feedback
#    Esperado: email al autor con rejection_reason + link a editar
```

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
