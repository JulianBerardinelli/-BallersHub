// Zod schemas for blog post mutations.
//
// Two granularities:
//   - saveDraftSchema: lenient. Anything goes — autor está armando el
//     borrador, le permitimos guardar a medio escribir.
//   - submitForReviewSchema: strict. Once the autor clicks "Submit for
//     review", we enforce minimum quality: title length, description
//     length, content size (proxy for ≥1500 palabras), hero image
//     present, cluster + tags. Matches docs/blog/contributor-guide.md.

import { z } from "zod";

// ~1500 words ≈ 7500 chars of plain text. TipTap output is HTML so we
// add a buffer for tags. 8000 chars HTML is roughly the threshold.
const MIN_CONTENT_HTML_CHARS = 8000;
const MAX_TITLE_CHARS = 120;
const MAX_DESCRIPTION_CHARS = 158;

const blogClusterSchema = z.enum([
  "career_guidance",
  "agency_ops",
  "industry_ar",
]);

const tagSchema = z
  .string()
  .trim()
  .min(2, "Tags deben tener al menos 2 caracteres")
  .max(30, "Tags deben tener máximo 30 caracteres");

// Stage 1 — draft save. We let the autor scribble anything; we only
// validate types, not content quality.
export const saveDraftSchema = z.object({
  id: z.string().uuid().optional(), // present when updating; absent when creating
  title: z.string().trim().max(MAX_TITLE_CHARS, `Máximo ${MAX_TITLE_CHARS} caracteres`),
  description: z.string().trim().max(MAX_DESCRIPTION_CHARS, `Máximo ${MAX_DESCRIPTION_CHARS} caracteres`),
  contentHtml: z.string().default(""),
  heroImageUrl: z.string().url("Subí una URL de imagen válida").nullable().optional(),
  cluster: blogClusterSchema,
  tags: z.array(tagSchema).max(8, "Máximo 8 tags").default([]),
});

export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

// Stage 2 — submit for review. Strict enforcement of editorial rules.
export const submitForReviewSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(15, "El título debe tener al menos 15 caracteres")
    .max(MAX_TITLE_CHARS),
  description: z
    .string()
    .trim()
    .min(50, "La descripción debe tener al menos 50 caracteres")
    .max(MAX_DESCRIPTION_CHARS),
  contentHtml: z
    .string()
    .min(
      MIN_CONTENT_HTML_CHARS,
      `El contenido debe ser sustancial (≥${MIN_CONTENT_HTML_CHARS} caracteres ≈ 1500 palabras)`,
    ),
  heroImageUrl: z
    .string()
    .url("Necesitás una imagen principal antes de enviar a revisión")
    .nonempty(),
  cluster: blogClusterSchema,
  tags: z
    .array(tagSchema)
    .min(3, "Mínimo 3 tags")
    .max(8, "Máximo 8 tags"),
});

export type SubmitForReviewInput = z.infer<typeof submitForReviewSchema>;

// Stage 3 — admin review.
export const adminReviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  rejectionReason: z.string().trim().min(20, "El feedback debe tener al menos 20 caracteres").nullable().optional(),
}).refine(
  (data) => data.decision === "approve" || (data.rejectionReason?.length ?? 0) >= 20,
  { message: "Si rechazás, el feedback es obligatorio (≥20 caracteres)", path: ["rejectionReason"] },
);

export type AdminReviewInput = z.infer<typeof adminReviewSchema>;
