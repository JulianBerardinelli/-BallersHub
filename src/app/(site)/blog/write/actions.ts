"use server";

// Server actions for the blogger write flow.
//
// Gated by requireBlogger() at the entry point of each action. The
// Drizzle connection runs as the postgres role which BYPASSES RLS, so
// we MUST also apply ownership filters (author_user_id = userId) in
// every UPDATE. The RLS policies are still active as defense-in-depth
// for any future client-side access (Supabase JS client honors them).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { blogPosts } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  saveDraftSchema,
  submitForReviewSchema,
  type SaveDraftInput,
  type SubmitForReviewInput,
} from "@/lib/blog/validation";
import { requireBlogger } from "@/lib/blog/permissions";
import { findFreeSlug } from "@/lib/blog/slug";
import { estimateReadingTime } from "@/lib/blog/reading-time";

type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string; fieldErrors?: Record<string, string | undefined> };

function flattenZodErrors(error: import("zod").ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Create a new draft. Returns the created post id so the caller can
 * redirect to /blog/write/[id].
 */
export async function createDraft(
  input: SaveDraftInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  let userId: string;
  try {
    const actor = await requireBlogger();
    userId = actor.userId;
  } catch (err) {
    return { success: false, message: "No tenés permisos para crear artículos." };
  }

  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revisá los datos del formulario.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const slug = await findFreeSlug(parsed.data.title || "borrador");

  const [created] = await db
    .insert(blogPosts)
    .values({
      slug,
      title: parsed.data.title || "Sin título",
      description: parsed.data.description || "",
      contentHtml: parsed.data.contentHtml || "",
      heroImageUrl: parsed.data.heroImageUrl ?? null,
      cluster: parsed.data.cluster,
      tags: parsed.data.tags,
      authorUserId: userId,
      status: "draft",
      readingTimeMin: estimateReadingTime(parsed.data.contentHtml || ""),
    })
    .returning({ id: blogPosts.id, slug: blogPosts.slug });

  revalidatePath("/blog/drafts");
  return { success: true, data: { id: created.id, slug: created.slug } };
}

/**
 * Save updates to an existing draft. Author can also save while the
 * post is `rejected` (so they can iterate after admin feedback) but
 * not while `pending_review` (admin owns it then) or `published`.
 */
export async function saveDraft(
  input: SaveDraftInput,
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    const actor = await requireBlogger();
    userId = actor.userId;
  } catch (err) {
    return { success: false, message: "No tenés permisos para editar artículos." };
  }

  if (!input.id) {
    return { success: false, message: "Falta el id del post a editar." };
  }

  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revisá los datos del formulario.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  // Ownership + state guard. RLS would also block but we want a
  // friendlier error than "no rows updated".
  const existing = await db
    .select({
      id: blogPosts.id,
      authorUserId: blogPosts.authorUserId,
      status: blogPosts.status,
    })
    .from(blogPosts)
    .where(eq(blogPosts.id, parsed.data.id!))
    .limit(1);

  const row = existing[0];
  if (!row) return { success: false, message: "No encontramos el post." };
  if (row.authorUserId !== userId) {
    return { success: false, message: "No tenés permisos sobre este post." };
  }
  if (row.status !== "draft" && row.status !== "rejected") {
    return {
      success: false,
      message:
        row.status === "pending_review"
          ? "El post está en revisión. Esperá la respuesta del admin antes de editar."
          : "No podés editar un post ya publicado. Pedile cambios al admin.",
    };
  }

  await db
    .update(blogPosts)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      contentHtml: parsed.data.contentHtml,
      heroImageUrl: parsed.data.heroImageUrl ?? null,
      cluster: parsed.data.cluster,
      tags: parsed.data.tags,
      readingTimeMin: estimateReadingTime(parsed.data.contentHtml || ""),
    })
    .where(
      and(
        eq(blogPosts.id, parsed.data.id!),
        eq(blogPosts.authorUserId, userId),
        inArray(blogPosts.status, ["draft", "rejected"]),
      ),
    );

  revalidatePath(`/blog/write/${parsed.data.id}`);
  revalidatePath("/blog/drafts");
  return { success: true, data: { id: parsed.data.id! } };
}

/**
 * Submit a draft for admin review. Enforces the strict editorial
 * schema (length, hero image, tags). Flips status to pending_review.
 */
export async function submitForReview(
  input: SubmitForReviewInput,
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    const actor = await requireBlogger();
    userId = actor.userId;
  } catch (err) {
    return { success: false, message: "No tenés permisos para enviar artículos." };
  }

  const parsed = submitForReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "El post no cumple con los requisitos mínimos para revisión.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  // First save the latest content (so submit captures the in-form values
  // even if the autor didn't click "Save draft" first), then flip status.
  const saveResult = await saveDraft({ ...parsed.data });
  if (!saveResult.success) return saveResult;

  await db
    .update(blogPosts)
    .set({
      status: "pending_review",
      // Clear any previous rejection so the queue doesn't show stale
      // feedback to the admin.
      rejectionReason: null,
    })
    .where(
      and(
        eq(blogPosts.id, parsed.data.id),
        eq(blogPosts.authorUserId, userId),
        inArray(blogPosts.status, ["draft", "rejected"]),
      ),
    );

  revalidatePath(`/blog/write/${parsed.data.id}`);
  revalidatePath("/blog/drafts");
  // TODO MVP-2: send email notification to admin here.
  return { success: true, data: { id: parsed.data.id } };
}

/**
 * Form-action wrapper for createDraft used by `<form action={...}>`.
 * Redirects to /blog/write/[id] on success — useful when the form
 * doesn't have client JS.
 */
export async function createDraftAndRedirect(formData: FormData): Promise<void> {
  const input: SaveDraftInput = {
    title: (formData.get("title") as string | null)?.trim() ?? "",
    description: (formData.get("description") as string | null)?.trim() ?? "",
    contentHtml: (formData.get("contentHtml") as string | null) ?? "",
    heroImageUrl: (formData.get("heroImageUrl") as string | null) || null,
    cluster: (formData.get("cluster") as SaveDraftInput["cluster"]) ?? "career_guidance",
    tags: ((formData.get("tags") as string | null) ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
  const result = await createDraft(input);
  if (result.success) redirect(`/blog/write/${result.data.id}`);
}
