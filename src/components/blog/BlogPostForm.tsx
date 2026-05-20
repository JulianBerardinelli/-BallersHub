"use client";

// Client-side form for /blog/write (new) and /blog/write/[id] (edit).
//
// Manages local state for title/description/heroImage/cluster/tags +
// TipTap content. Calls the server actions createDraft, saveDraft,
// submitForReview. Shows inline errors from the action result.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "./RichTextEditor";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import type { BlogCluster, BlogStatus } from "@/db/schema";
import {
  createDraft,
  saveDraft,
  submitForReview,
} from "@/app/(site)/blog/write/actions";

type Mode =
  | { kind: "create" }
  | {
      kind: "edit";
      postId: string;
      currentStatus: BlogStatus;
      rejectionReason: string | null;
    };

type Props = {
  mode: Mode;
  initialValues?: {
    title?: string;
    description?: string;
    contentHtml?: string;
    heroImageUrl?: string | null;
    cluster?: BlogCluster;
    tags?: string[];
  };
};

type Feedback =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "submitting" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string; fieldErrors?: Record<string, string | undefined> };

export function BlogPostForm({ mode, initialValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(initialValues?.heroImageUrl ?? "");
  const [cluster, setCluster] = useState<BlogCluster>(
    initialValues?.cluster ?? "career_guidance",
  );
  const [tagsInput, setTagsInput] = useState((initialValues?.tags ?? []).join(", "));
  const [contentHtml, setContentHtml] = useState(initialValues?.contentHtml ?? "");
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });

  const parseTags = (raw: string): string[] =>
    raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const inputs = () => ({
    title: title.trim(),
    description: description.trim(),
    contentHtml,
    heroImageUrl: heroImageUrl.trim() || null,
    cluster,
    tags: parseTags(tagsInput),
  });

  const handleSave = () => {
    setFeedback({ kind: "saving" });
    startTransition(async () => {
      if (mode.kind === "create") {
        const result = await createDraft(inputs());
        if (result.success) {
          setFeedback({ kind: "ok", message: "Borrador creado." });
          router.push(`/blog/write/${result.data.id}`);
        } else {
          setFeedback({
            kind: "error",
            message: result.message,
            fieldErrors: result.fieldErrors,
          });
        }
      } else {
        const result = await saveDraft({ id: mode.postId, ...inputs() });
        if (result.success) {
          setFeedback({ kind: "ok", message: "Borrador guardado." });
          router.refresh();
        } else {
          setFeedback({
            kind: "error",
            message: result.message,
            fieldErrors: result.fieldErrors,
          });
        }
      }
    });
  };

  const handleSubmitForReview = () => {
    if (mode.kind !== "edit") return;
    setFeedback({ kind: "submitting" });
    startTransition(async () => {
      const payload = {
        id: mode.postId,
        title: title.trim(),
        description: description.trim(),
        contentHtml,
        heroImageUrl: heroImageUrl.trim(),
        cluster,
        tags: parseTags(tagsInput),
      };
      const result = await submitForReview(payload);
      if (result.success) {
        setFeedback({
          kind: "ok",
          message: "Enviado para revisión. Te avisamos cuando el admin lo apruebe.",
        });
        router.push("/blog/drafts");
      } else {
        setFeedback({
          kind: "error",
          message: result.message,
          fieldErrors: result.fieldErrors,
        });
      }
    });
  };

  const fieldError = (name: string): string | undefined =>
    feedback.kind === "error" ? feedback.fieldErrors?.[name] : undefined;

  const canSubmit = mode.kind === "edit" &&
    (mode.currentStatus === "draft" || mode.currentStatus === "rejected");

  return (
    <div className="space-y-6">
      {mode.kind === "edit" && mode.currentStatus === "rejected" && mode.rejectionReason && (
        <div className="rounded-bh-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold uppercase tracking-[0.08em] text-amber-300">
            Feedback del admin
          </p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{mode.rejectionReason}</p>
        </div>
      )}

      <Field label="Título" error={fieldError("title")} hint="Máx 120 caracteres. Pensá keyword-rich.">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-base text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          placeholder="Ej: Mercado de pases AFA 2026: jugadores libres más buscados"
        />
      </Field>

      <Field label="Descripción corta" error={fieldError("description")} hint="Aparece en Google y al compartir en redes. Máx 158 caracteres.">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={158}
          rows={2}
          className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          placeholder="Resumen claro de lo que va a leer."
        />
        <p className="mt-1 text-[11px] text-bh-fg-3">{description.length} / 158</p>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cluster" error={fieldError("cluster")} hint="Tema del post.">
          <select
            value={cluster}
            onChange={(e) => setCluster(e.target.value as BlogCluster)}
            className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          >
            {Object.entries(CLUSTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags" error={fieldError("tags")} hint="3-8 tags separados por coma. Mín 2 caracteres cada uno.">
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
            placeholder="scouting, portfolio, primera-nacional"
          />
        </Field>
      </div>

      <Field label="URL de imagen principal" error={fieldError("heroImageUrl")} hint="1200x630 ideal. Sube la imagen al storage de media y pegá el link público.">
        <input
          type="url"
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          placeholder="https://…"
        />
      </Field>

      <Field label="Contenido" error={fieldError("contentHtml")} hint="≥1500 palabras. Mínimo 3 secciones H2. Linkear ≥3 portfolios reales de /[slug].">
        <RichTextEditor
          initialContent={initialValues?.contentHtml ?? ""}
          onChange={setContentHtml}
          placeholder="Empezá con una intro de 2-3 párrafos que enganche al lector…"
        />
      </Field>

      {feedback.kind === "ok" && (
        <p className="text-sm font-semibold text-bh-lime">{feedback.message}</p>
      )}
      {feedback.kind === "error" && (
        <p className="text-sm font-semibold text-red-300">{feedback.message}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-bh-fg-4 pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-bh-md border border-bh-fg-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-bh-fg-2 transition-colors hover:border-bh-fg-3 hover:text-bh-fg-1 disabled:opacity-50"
        >
          {feedback.kind === "saving" ? "Guardando…" : "Guardar borrador"}
        </button>
        {canSubmit && (
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={isPending}
            className="rounded-bh-md bg-bh-lime px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-bh-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {feedback.kind === "submitting" ? "Enviando…" : "Enviar para revisión"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-fg-2">
        {label}
      </span>
      {hint && <span className="mt-0.5 block text-[11px] text-bh-fg-3">{hint}</span>}
      <div className="mt-2">{children}</div>
      {error && <span className="mt-1 block text-[11px] text-red-300">{error}</span>}
    </label>
  );
}
