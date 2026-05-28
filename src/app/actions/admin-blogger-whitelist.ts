"use server";

// Admin actions for the blogger whitelist (`/admin/blogger-whitelist`).
//
// Hasta ahora el toggle `user_profiles.is_blogger` se hacía manual via
// SQL (documentado en docs/blog/README.md §10). Esto cierra MVP-2 #4:
// UI para gestionar bloggers + lista actual + autocomplete de users.
//
// Diseño:
//   - listBloggers() devuelve los users con is_blogger=true + metadata
//     de blog_authors (display_name, slug, headline) si existe.
//   - grantBloggerAccess(userId) hace 2 cosas:
//       1. UPDATE user_profiles SET is_blogger=true
//       2. INSERT blog_authors row con defaults razonables (si no existe)
//     Esto deja al user listo para escribir un post inmediatamente.
//   - revokeBloggerAccess(userId) solo hace is_blogger=false. NO borra
//     el blog_authors row (preserva posts publicados + author hub URL
//     histórica). Si el admin quiere borrar el hub, lo hace manualmente.
//   - searchUsersForBloggerGrant es idéntico al patrón de comp-accounts:
//     listUsers de Supabase Auth + filter cliente.
//
// Audit: cada grant/revoke escribe en audit_logs para traceability.

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles, blogAuthors, auditLogs } from "@/db/schema";
import { isAdmin } from "@/lib/admin/auth";
import { slugifyText } from "@/lib/blog/slug";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------
// Auth helper (same pattern as admin-comp-accounts.ensureAdmin)
// ---------------------------------------------------------------

async function ensureAdmin(): Promise<
  | { ok: true; actorId: string; actorIp: string | null }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const allowed = await isAdmin(user.id);
  if (!allowed) return { ok: false, error: "Solo admins" };

  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? null;
  const actorIp = fwd ? fwd.split(",")[0].trim() : null;
  return { ok: true, actorId: user.id, actorIp };
}

// ---------------------------------------------------------------
// Read API
// ---------------------------------------------------------------

export type BloggerRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  // Si tiene blog_authors row — null si fue whitelist-only sin metadata
  hubSlug: string | null;
  hubDisplayName: string | null;
  hubHeadline: string | null;
  hubBio: string | null;
  hubCreatedAt: string | null;
};

/**
 * Lista todos los users con `user_profiles.is_blogger = true`, junto
 * con su metadata de `blog_authors` (si existe) y el email/full_name
 * de `auth.users` (vía Supabase Admin client).
 */
export async function listBloggers(): Promise<ActionResult<BloggerRow[]>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  // Step 1: user_ids whitelisted como bloggers.
  const profiles = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.isBlogger, true));

  if (profiles.length === 0) return { ok: true, data: [] };

  const userIds = profiles.map((p) => p.userId);

  // Step 2: metadata de blog_authors (LEFT JOIN behavior — may or may
  // not exist per user, ya que el whitelist puede preceder al row).
  const authors = await db
    .select({
      userId: blogAuthors.userId,
      slug: blogAuthors.slug,
      displayName: blogAuthors.displayName,
      headline: blogAuthors.headline,
      bio: blogAuthors.bio,
      createdAt: blogAuthors.createdAt,
    })
    .from(blogAuthors);
  const authorByUserId = new Map(authors.map((a) => [a.userId, a]));

  // Step 3: email + full_name de auth.users (via admin client).
  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdmin();

  const rows: BloggerRow[] = [];
  for (const userId of userIds) {
    let email: string | null = null;
    let fullName: string | null = null;
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data?.user?.email ?? null;
      fullName =
        (data?.user?.user_metadata?.full_name as string | undefined) ?? null;
    } catch {
      /* ignore — user puede haber sido borrado */
    }
    const author = authorByUserId.get(userId);
    rows.push({
      userId,
      email,
      fullName,
      hubSlug: author?.slug ?? null,
      hubDisplayName: author?.displayName ?? null,
      hubHeadline: author?.headline ?? null,
      hubBio: author?.bio ?? null,
      hubCreatedAt: author?.createdAt
        ? new Date(author.createdAt).toISOString()
        : null,
    });
  }

  // Sort: los que tienen hub primero (más completos), después el resto.
  rows.sort((a, b) => {
    if (!!a.hubSlug === !!b.hubSlug) {
      return (a.email ?? "").localeCompare(b.email ?? "");
    }
    return a.hubSlug ? -1 : 1;
  });

  return { ok: true, data: rows };
}

// ---------------------------------------------------------------
// User search (typeahead) — same pattern as comp-accounts
// ---------------------------------------------------------------

const userSearchSchema = z.object({
  query: z.string().min(2).max(120),
});

export type SearchResultRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  alreadyBlogger: boolean;
};

export async function searchUsersForBloggerGrant(
  input: z.infer<typeof userSearchSchema>,
): Promise<ActionResult<SearchResultRow[]>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = userSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Búsqueda inválida" };
  }

  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdmin();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const q = parsed.data.query.toLowerCase();
  const matchedUsers = (data?.users ?? [])
    .filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = (
        (u.user_metadata?.full_name as string | undefined) ?? ""
      ).toLowerCase();
      return email.includes(q) || name.includes(q);
    })
    .slice(0, 20);

  if (matchedUsers.length === 0) return { ok: true, data: [] };

  // Para cada match, chequear si ya es blogger (UI indica con badge).
  const matchIds = matchedUsers.map((u) => u.id);
  const existingBloggers = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.isBlogger, true));
  const bloggerSet = new Set(existingBloggers.map((r) => r.userId));

  const results: SearchResultRow[] = matchedUsers
    .filter((u) => matchIds.includes(u.id))
    .map((u) => ({
      userId: u.id,
      email: u.email ?? null,
      fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
      alreadyBlogger: bloggerSet.has(u.id),
    }));

  return { ok: true, data: results };
}

// ---------------------------------------------------------------
// Grant: set is_blogger=true + auto-create blog_authors row
// ---------------------------------------------------------------

const grantSchema = z.object({
  targetUserId: z.string().uuid(),
  // Opcional: si el admin quiere setear el display_name a algo
  // distinto del fullname/email default. Sino se deriva server-side.
  displayName: z.string().min(2).max(120).optional(),
  reason: z.string().max(500).optional(),
});

export async function grantBloggerAccess(
  input: z.infer<typeof grantSchema>,
): Promise<ActionResult<{ userId: string; hubSlug: string }>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  // Resolve email + full_name del target via auth.admin (necesario
  // para defaults razonables de blog_authors).
  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdmin();
  const { data: targetData } = await admin.auth.admin.getUserById(
    parsed.data.targetUserId,
  );
  const target = targetData?.user;
  if (!target) return { ok: false, error: "Usuario no encontrado" };

  const targetEmail = target.email ?? null;
  const targetFullName =
    (target.user_metadata?.full_name as string | undefined) ?? null;
  const displayName =
    parsed.data.displayName?.trim() ||
    targetFullName ||
    (targetEmail ? targetEmail.split("@")[0] : "Autor invitado");

  // Step 1: UPDATE user_profiles.is_blogger=true
  // user_profiles puede no existir si nunca completó onboarding —
  // pero is_blogger requiere el row, así que asumimos que existe.
  // Si no existe, retornamos error informativo.
  const profileExists = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, parsed.data.targetUserId))
    .limit(1);
  if (profileExists.length === 0) {
    return {
      ok: false,
      error:
        "El usuario no tiene perfil de usuario creado. Pedile que complete onboarding primero.",
    };
  }

  await db
    .update(userProfiles)
    .set({ isBlogger: true })
    .where(eq(userProfiles.userId, parsed.data.targetUserId));

  // Step 2: INSERT blog_authors row (idempotente — si ya existe,
  // mantenemos el slug existente para no romper URLs históricas).
  const existing = await db
    .select({ slug: blogAuthors.slug })
    .from(blogAuthors)
    .where(eq(blogAuthors.userId, parsed.data.targetUserId))
    .limit(1);

  let hubSlug: string;
  if (existing.length > 0) {
    hubSlug = existing[0].slug;
  } else {
    // Derive slug from displayName, ensure uniqueness via suffix loop.
    const root = slugifyText(displayName) || "autor";
    hubSlug = await findFreeAuthorSlug(root);
    await db.insert(blogAuthors).values({
      userId: parsed.data.targetUserId,
      slug: hubSlug,
      displayName,
      // headline/bio quedan null — el blogger los completa después en
      // /admin/blogger-whitelist (cuando tengamos esa UI) o via SQL.
    });
  }

  // Step 3: audit log.
  try {
    await db.insert(auditLogs).values({
      userId: auth.actorId,
      actorIp: auth.actorIp,
      action: "blog.blogger.grant",
      subjectTable: "user_profiles",
      subjectId: parsed.data.targetUserId,
      meta: {
        targetEmail,
        targetFullName,
        hubSlug,
        displayName,
        reason: parsed.data.reason ?? null,
      },
    });
  } catch (err) {
    // Audit log failure no debe romper el grant — solo log.
    console.error("[blogger-whitelist/grant] audit log failed:", err);
  }

  revalidatePath("/admin/blogger-whitelist");
  return {
    ok: true,
    data: { userId: parsed.data.targetUserId, hubSlug },
  };
}

// ---------------------------------------------------------------
// Revoke: set is_blogger=false (NO borra blog_authors row)
// ---------------------------------------------------------------

const revokeSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function revokeBloggerAccess(
  input: z.infer<typeof revokeSchema>,
): Promise<ActionResult<{ userId: string }>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  await db
    .update(userProfiles)
    .set({ isBlogger: false })
    .where(eq(userProfiles.userId, parsed.data.targetUserId));

  // Preservamos blog_authors row para que:
  //  - Los posts publicados sigan con author hub válido
  //  - El @id del Person en Article schema no rompa
  //  - Si re-grantsean al user, su slug histórico se preserva
  // Si el admin quiere borrar el hub, lo hace manual via SQL.

  try {
    await db.insert(auditLogs).values({
      userId: auth.actorId,
      actorIp: auth.actorIp,
      action: "blog.blogger.revoke",
      subjectTable: "user_profiles",
      subjectId: parsed.data.targetUserId,
      meta: {
        reason: parsed.data.reason ?? null,
      },
    });
  } catch (err) {
    console.error("[blogger-whitelist/revoke] audit log failed:", err);
  }

  revalidatePath("/admin/blogger-whitelist");
  return { ok: true, data: { userId: parsed.data.targetUserId } };
}

// ---------------------------------------------------------------
// Slug helper (local to this file; mirrors src/lib/blog/slug.ts)
// ---------------------------------------------------------------

async function findFreeAuthorSlug(root: string): Promise<string> {
  let candidate = root;
  let suffix = 1;
  while (true) {
    const existing = await db
      .select({ slug: blogAuthors.slug })
      .from(blogAuthors)
      .where(eq(blogAuthors.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}
