"use server";

// Admin actions for the blog review queue.
//
// All gated by requireBlogAdmin(). Same caveat as the blogger actions:
// Drizzle bypasses RLS, so ownership/state validation happens here.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireBlogAdmin } from "@/lib/blog/permissions";
import { adminReviewSchema, type AdminReviewInput } from "@/lib/blog/validation";
import { estimateReadingTime } from "@/lib/blog/reading-time";
import { revalidateBlogSurfaces } from "@/lib/blog/revalidate";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import { hydrateAuthors, fallbackDisplayName } from "@/lib/blog/authors";
import { getAuthorEmailById } from "@/lib/blog/email-recipients";
import {
  sendBlogPostApprovedAuthorEmail,
  sendBlogPostRejectedAuthorEmail,
} from "@/lib/resend";

type ActionResult =
  | { success: true; message?: string }
  | { success: false; message: string };

/**
 * Approve a pending post: status → published, set publishedAt, audit.
 * Rejects a post: status → rejected + rejectionReason, audit.
 */
export async function reviewPost(input: AdminReviewInput): Promise<ActionResult> {
  let adminId: string;
  try {
    const actor = await requireBlogAdmin();
    adminId = actor.userId;
  } catch {
    return { success: false, message: "Necesitás permisos de admin." };
  }

  const parsed = adminReviewSchema.safeParse(input);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { success: false, message: firstErr };
  }

  const now = new Date();
  if (parsed.data.decision === "approve") {
    await db
      .update(blogPosts)
      .set({
        status: "published",
        publishedAt: now,
        rejectionReason: null,
        reviewedByUserId: adminId,
        reviewedAt: now,
      })
      .where(eq(blogPosts.id, parsed.data.id));
  } else {
    await db
      .update(blogPosts)
      .set({
        status: "rejected",
        rejectionReason: parsed.data.rejectionReason ?? "Sin feedback.",
        reviewedByUserId: adminId,
        reviewedAt: now,
      })
      .where(eq(blogPosts.id, parsed.data.id));
  }

  // Resolve post (slug + author + content) for revalidation + email payload.
  const row = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      cluster: blogPosts.cluster,
      authorUserId: blogPosts.authorUserId,
      rejectionReason: blogPosts.rejectionReason,
    })
    .from(blogPosts)
    .where(eq(blogPosts.id, parsed.data.id))
    .limit(1);

  await revalidateBlogSurfaces(row[0]?.slug ?? null);
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/pending");

  // Notify author. Decoupled try/catch — si el email falla, la action
  // principal ya escribió OK y el admin no debería ver un error.
  if (row[0]) {
    try {
      const post = row[0];
      const [authorEmail, authorsMap] = await Promise.all([
        getAuthorEmailById(post.authorUserId),
        hydrateAuthors([post.authorUserId]),
      ]);
      const hydrated = authorsMap.get(post.authorUserId);
      const blogAuthor = hydrated?.blogAuthor ?? null;
      const authorName =
        blogAuthor?.displayName ?? fallbackDisplayName(hydrated?.role);
      const clusterLabel = CLUSTER_LABELS[post.cluster];

      if (authorEmail) {
        if (parsed.data.decision === "approve") {
          await sendBlogPostApprovedAuthorEmail({
            authorEmail,
            authorName,
            postTitle: post.title,
            postSlug: post.slug,
            clusterLabel,
            authorSlug: blogAuthor?.slug ?? null,
          });
        } else {
          await sendBlogPostRejectedAuthorEmail({
            authorEmail,
            authorName,
            postId: parsed.data.id,
            postTitle: post.title,
            rejectionReason: post.rejectionReason ?? "Sin feedback.",
          });
        }
      } else {
        console.warn(
          `[blog] reviewPost: no email found for author ${post.authorUserId}, skipping notification`,
        );
      }
    } catch (err) {
      console.error("[blog] reviewPost author notification failed:", err);
    }
  }

  return { success: true };
}

/**
 * Unpublish a published post: status → draft. URL /blog/[slug] starts
 * returning 404 immediately. Keeps publishedAt for audit (so we know
 * "was published from X to Y").
 */
export async function unpublishPost(postId: string): Promise<ActionResult> {
  try {
    await requireBlogAdmin();
  } catch {
    return { success: false, message: "Necesitás permisos de admin." };
  }

  const row = await db
    .select({ slug: blogPosts.slug, status: blogPosts.status })
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  if (!row[0]) return { success: false, message: "Post no encontrado." };
  if (row[0].status !== "published") {
    return { success: false, message: "Sólo se pueden despublicar posts published." };
  }

  await db
    .update(blogPosts)
    .set({ status: "draft" })
    .where(eq(blogPosts.id, postId));

  await revalidateBlogSurfaces(row[0].slug);
  revalidatePath("/admin/blog");
  return { success: true };
}

/**
 * Admin can edit any post in any state. Differs from the author edit
 * action in that we don't gate by status. Used to fix typos, update
 * slugs, change cluster, etc.
 *
 * If the post is already published, updated_at advances (via trigger)
 * and we revalidate the public surfaces so the new content shows up.
 */
export async function editPostAsAdmin(
  postId: string,
  patch: {
    title?: string;
    description?: string;
    contentHtml?: string;
    heroImageUrl?: string | null;
    slug?: string;
    cluster?: "career_guidance" | "agency_ops" | "industry_ar";
    tags?: string[];
  },
): Promise<ActionResult> {
  try {
    await requireBlogAdmin();
  } catch {
    return { success: false, message: "Necesitás permisos de admin." };
  }

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.heroImageUrl !== undefined) updates.heroImageUrl = patch.heroImageUrl;
  if (patch.slug !== undefined) updates.slug = patch.slug;
  if (patch.cluster !== undefined) updates.cluster = patch.cluster;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (patch.contentHtml !== undefined) {
    updates.contentHtml = patch.contentHtml;
    updates.readingTimeMin = estimateReadingTime(patch.contentHtml);
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "No hay cambios para guardar." };
  }

  await db.update(blogPosts).set(updates).where(eq(blogPosts.id, postId));

  const row = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  await revalidateBlogSurfaces(row[0]?.slug ?? null);
  revalidatePath(`/admin/blog/${postId}`);
  revalidatePath("/admin/blog");
  return { success: true };
}

/**
 * Hard delete. Admin only. Use sparingly — prefer unpublish for
 * cases where you might want to recover the content later.
 */
export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    await requireBlogAdmin();
  } catch {
    return { success: false, message: "Necesitás permisos de admin." };
  }

  const row = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  if (!row[0]) return { success: false, message: "Post no encontrado." };

  await db.delete(blogPosts).where(eq(blogPosts.id, postId));

  await revalidateBlogSurfaces(row[0].slug);
  revalidatePath("/admin/blog");
  return { success: true };
}
