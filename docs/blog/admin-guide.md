# Guía de admin — Review editorial del blog

> Esta guía es para el admin del blog (Julián, eventualmente delegable).

---

## 1. Tu trabajo como admin del blog

Tenés 3 responsabilidades editoriales:

1. **Whitelistear contributors** — decidir quién puede submitear posts
2. **Review de posts pendientes** — aprobar / rechazar / editar antes de publicar
3. **Mantenimiento de posts publicados** — unpublish o editar si algo se rompe post-publicación

---

## 2. Whitelistear un nuevo blogger

### Cómo invitar a alguien

**MVP-1 (manual via SQL)**:

1. La persona se registra en 'BallersHub como user normal (player, agency, o lead)
2. Pedile su email o user_id
3. Marcar el flag `is_blogger=true` en su `user_profiles`:

```sql
-- Buscá el user_id por email
SELECT user_id, email FROM auth.users WHERE email = 'persona@ejemplo.com';

-- Marcalo como blogger
UPDATE user_profiles SET is_blogger = true WHERE user_id = '<uuid>';

-- Verificá
SELECT user_id, is_blogger FROM user_profiles WHERE user_id = '<uuid>';
```

Ejecutalo en:
- **Dev**: Supabase Studio del proyecto `avhctddkbcneugtqqxxk`
- **Prod**: Supabase Studio del proyecto `erdvpcfjynkhcrqktozd` (cuidado, es vivo)

4. Avisale a la persona que ya está habilitada, mandale [`contributor-guide.md`](./contributor-guide.md)

**MVP-3 (UI futura)**: `/admin/users` con toggle "Marcar como blogger". No hay ETA, mientras tanto SQL.

### Quitar el flag a alguien

```sql
UPDATE user_profiles SET is_blogger = false WHERE user_id = '<uuid>';
```

Sus posts existentes NO se borran. Solo pierde la capacidad de submitear nuevos.

### Criterios sugeridos para whitelistear

- **Reputación**: tiene reputación en el ámbito del fútbol AR (scout, periodista, ex-jugador, analista)
- **Antecedentes**: muestra contenido previo escrito de calidad (post en blog propio, columnas en medios, posts de IG con análisis)
- **Audiencia**: te trae audiencia propia (10k+ seguidores en IG/X) — link equity inverso, su difusión empuja tus posts
- **Compromiso**: dice "voy a escribir 1 post al mes" y lo cumple

NO recomiendo whitelistear:
- Players o agencies que quieren posts auto-promocionales (los detectás rápido por draft 1)
- Gente sin antecedentes online verificables (cuenta sin posteos, perfil reciente)
- Pedidos sospechosos de "quiero escribir sobre crypto/forex/etc." (off-topic claro)

---

## 3. Review de posts pendientes

### Cómo entrar a la queue

Cuando alguien submite, entrás a [/admin/blog/pending](/admin/blog/pending) y ves la lista de posts en estado `pending_review`.

(MVP-2: vas a recibir email automático. Por ahora chequeá manual cada día o dos.)

### Qué evaluar en cada post

Usá este checklist:

#### ✅ Calidad editorial

- [ ] **Longitud** ≥1500 palabras (visible arriba del editor)
- [ ] **Estructura**: ≥3 secciones H2, intro clara, conclusión con CTA
- [ ] **Tono profesional** (no demasiado coloquial, no AI-detectable)
- [ ] **Datos con fuente**: si afirma cifras o stats, hay link a fuente

#### ✅ SEO obligatorio

- [ ] **Title** keyword-rich (no clickbait genérico)
- [ ] **Description** ≤158 chars, descriptiva
- [ ] **Slug** limpio (sin acentos raros, sin números aleatorios)
- [ ] **Hero image** 1200×630 sin watermark
- [ ] **Cluster** correcto para el contenido
- [ ] **≥3 links a `/[slug]` reales** con anchor = nombre del jugador
- [ ] **≥1 link a fuente externa autoritativa**
- [ ] **Tags relevantes** (3-5, no genéricos como "fútbol")

#### ✅ Compliance + legal

- [ ] **Sin afirmaciones de transferencia/contrato** sin fuente oficial
- [ ] **Sin datos personales sin consentimiento** (números de teléfono, direcciones de jugadores)
- [ ] **Sin contenido copiado de otro sitio** (chequeá con `Cmd+F` en Google poniendo un párrafo entre comillas)
- [ ] **Sin promoción de competidores** (Transfermarkt como fuente está OK, pero no "comprá Transfermarkt Premium")

### Decisión final

| Resultado | Acción |
|---|---|
| **Aprobar** | Click "Aprobar y publicar" → status pasa a `published`, published_at=now, aparece en sitemap |
| **Rechazar** | Click "Rechazar" → escribir `rejection_reason` (qué cambiar) → status pasa a `rejected`, autor lo ve en sus borradores |
| **Editar y aprobar** | Click "Editar" → arreglás vos los detalles menores (typos, links, slug) → click "Guardar y publicar" |

### Cómo escribir un rejection_reason útil

**MAL**:
> "Necesita más trabajo."

**BIEN**:
> "Buen ángulo del tema, pero faltan 3 cosas:
> 1. Solo linkeás a 1 portfolio (Julián). Necesitamos ≥3 — sumá Lucía Gómez y Santiago Pérez que mencionás.
> 2. La sección de stats no tiene fuente. Si afirmás 'el 40% de los U20 fichan al exterior', linkeá a la fuente o quitálo.
> 3. La intro arranca con 'En el fascinante mundo del fútbol...' — eso sale recurrente en AI-generated. Reescribilo a tu voz natural.
> Cuando lo tengas, mandámelo de nuevo."

Razones para escribir feedback específico:
- El autor sabe exactamente qué cambiar → menos ciclos de review
- Construís relación con el autor (no se siente rechazado arbitrariamente)
- Calidad del próximo post sube

---

## 4. Editar un post desde admin

Tenés 2 contextos para editar:

### Editar un draft/pending del autor antes de publicar

Ej: el post está casi perfecto pero hay 2 typos y un slug raro.

1. Entrás al detail en `/admin/blog/[id]`
2. Click "Editar"
3. Corregís en el editor (mismo TipTap que usa el autor)
4. Click "Guardar y publicar"

Si los cambios son mínimos (typo), no hace falta avisar al autor. Si cambias significativamente (re-escribís un párrafo o sección), avisale por DM.

### Editar un post ya publicado

Ej: el autor te pide actualizar un dato 3 meses después.

1. Entrás al detail en `/admin/blog/[id]` (busca en `/admin/blog` filtrado por status=published)
2. Click "Editar"
3. Modificás
4. Click "Guardar" → `updated_at` se actualiza pero `published_at` no
5. Sitemap registra la nueva `lastmod`, Google recrawlea

Si el cambio es grande (más del 30% del post), considerá **unpublish + re-publish** como post nuevo (slug distinto).

---

## 5. Unpublish un post

Si tenés que despublicar urgente (error grave, legal issue, autor pidió bajar):

1. `/admin/blog/[id]`
2. Click "Unpublish" → status pasa a `draft`, `published_at` se mantiene (para auditoría)
3. La URL `/blog/[slug]` empieza a devolver 404
4. Sitemap se actualiza en el próximo revalidate (1h)
5. Google lo desindexa en 1-2 semanas

**Nota legal**: si el post tiene afirmaciones que generaron una queja legal, considerá guardar el contenido en otra columna (backup) antes de unpublish — por si necesitás referirte después.

---

## 6. Métricas que mirar

Después de cada publish, sirve trackear:

| Métrica | Dónde mirarla | Acción si baja |
|---|---|---|
| **Impresiones GSC** del slug del post | Google Search Console → Performance → por URL | Si en 30 días tiene <100 impresiones, repensar título/cluster |
| **Posición SERP** para el target keyword | GSC → Performance → query | Si está en posición >50, el post no estaba alineado con la query |
| **Click-through rate** | GSC | Si <2% con buena posición, mejorar meta description |
| **Crawl frequency** de los portfolios linkeados | GSC → Crawl Stats | Si no sube, el link equity no está fluyendo — chequear nofollow o rel mal |
| **Conversiones desde el post** | Vercel Analytics → referrer | Si trae views pero 0 signups, mejorar CTA al final del post |

---

## 7. Workflow recomendado para el admin

### Cadencia ideal

- **Daily** (~10 min): chequear queue de pending (si está vacía, todo bien)
- **Weekly** (~30 min): revisar GSC para posts publicados últimos 90 días
- **Monthly** (~1h): repasar contributors activos, identificar quién quedó dormido y prompteár

### Si llega un volumen alto

Si recibís >5 posts pendientes por día, vas a saturarte. Estrategias:

1. **Delegá a un editor**: marcá a alguien de confianza como admin secundario (require permisos DB)
2. **Subí el bar de whitelistear**: menos contributors = menos volumen de review
3. **Templates de feedback**: armá macros en Notion/Sheets para copiar-pegar los rejection reasons frecuentes

---

## 8. SQL útil para admin

```sql
-- Posts pendientes ahora mismo
SELECT id, slug, title, author_user_id, created_at
FROM blog_posts
WHERE status = 'pending_review'
ORDER BY created_at ASC;

-- Posts publicados últimos 30 días
SELECT slug, title, published_at, reading_time_min
FROM blog_posts
WHERE status = 'published'
  AND published_at > now() - interval '30 days'
ORDER BY published_at DESC;

-- Top contributors por count de posts publicados
SELECT
  u.email,
  p.full_name,
  COUNT(*) FILTER (WHERE bp.status = 'published') AS published_count,
  COUNT(*) FILTER (WHERE bp.status = 'rejected') AS rejected_count
FROM blog_posts bp
JOIN user_profiles p ON p.user_id = bp.author_user_id
JOIN auth.users u ON u.id = bp.author_user_id
GROUP BY u.email, p.full_name
ORDER BY published_count DESC;

-- Bloggers whitelisted hoy
SELECT u.email, p.full_name, p.is_blogger
FROM user_profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.is_blogger = true
ORDER BY u.email;
```

Recordá: para dev usá `avhctddkbcneugtqqxxk`, para prod `erdvpcfjynkhcrqktozd`.

---

## 9. Cuando algo se rompe

| Síntoma | Causa probable | Fix |
|---|---|---|
| El blog público devuelve 500 | Bug en `/blog` o `/blog/[slug]` | Vercel logs → trazar error |
| Un post publicado no aparece en sitemap | Sitemap está cacheado | Esperar 1h o forzar revalidate via API |
| Un autor dice "no veo el botón Escribir" | Flag `is_blogger` no aplicado | Verificar SQL `SELECT is_blogger FROM user_profiles WHERE user_id=...` |
| Rich Results Test falla en un post | Article JSON-LD inválido | Chequear que `author` y `publisher` resuelven con `@id` |
| Un post viejo perdió posición en SERP | Contenido ya no es relevante / competencia subió | Re-trabajar el post (refresh content, actualizar links) y forzar re-index en GSC |

---

## 10. Roadmap del sistema (para tu visibilidad)

| Versión | Qué entra |
|---|---|
| **MVP-1** (actual) | Editor TipTap, drafts, submit, review queue, public blog, Article JSON-LD, sitemap extension |
| **MVP-2** | Email notifications, author hubs `/blog/autores/[slug]` con `ProfilePage`, image upload integrado en TipTap |
| **MVP-3** | UI de admin para togglear `is_blogger`, cluster hubs `/blog/cluster/[slug]`, YouTube embeds |

Cosas que NO están en roadmap (decisión consciente):
- Comentarios / reacciones de lectores
- Newsletter integrado
- Multi-language posts

Esas se evalúan caso por caso cuando tengamos volumen real.
