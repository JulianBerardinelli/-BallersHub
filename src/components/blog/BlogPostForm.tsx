"use client";

// Client-side form for /blog/write (new) and /blog/write/[id] (edit).
//
// Manages local state for title/description/heroImage/cluster/tags +
// TipTap content. Calls the server actions createDraft, saveDraft,
// submitForReview. Shows inline errors from the action result.
//
// MVP-2 #3 — hero image upload integrado a Supabase Storage. El
// campo URL externa se reemplaza por file picker + preview. Todo
// flow va al bucket `blog-media` para que next/image funcione sin
// expandir remotePatterns.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, ImageIcon, X } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import type { BlogCluster, BlogStatus } from "@/db/schema";
import {
  createDraft,
  saveDraft,
  submitForReview,
} from "@/app/[locale]/(site)/blog/write/actions";

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
    /** ISO 639-1 locale for this post (i18n F6). Only editable on create. */
    locale?: "es" | "en" | "it" | "pt";
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
  const t = useTranslations("blog");
  const tForm = useTranslations("blog.form");
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(initialValues?.heroImageUrl ?? "");
  const [cluster, setCluster] = useState<BlogCluster>(
    initialValues?.cluster ?? "career_guidance",
  );
  // i18n F6: post locale. Editable only on create — on edit it stays fixed
  // (the post lives at a specific URL per locale).
  const [postLocale, setPostLocale] = useState<"es" | "en" | "it" | "pt">(
    initialValues?.locale ?? "es",
  );
  const [tagsInput, setTagsInput] = useState((initialValues?.tags ?? []).join(", "));
  const [contentHtml, setContentHtml] = useState(initialValues?.contentHtml ?? "");
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const triggerHeroUpload = () => heroFileInputRef.current?.click();

  const handleHeroFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset para permitir re-upload del mismo
    if (!file) return;

    setHeroError(null);
    setHeroUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog/media/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setHeroError(json.error ?? tForm("fields.heroUploadError"));
        return;
      }
      setHeroImageUrl(json.url);
    } catch (err) {
      console.error("[BlogPostForm] hero upload failed:", err);
      setHeroError(tForm("fields.heroUploadErrorRetry"));
    } finally {
      setHeroUploading(false);
    }
  };

  const clearHero = () => {
    setHeroImageUrl("");
    setHeroError(null);
  };

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
    locale: postLocale,
  });

  const handleSave = () => {
    setFeedback({ kind: "saving" });
    startTransition(async () => {
      if (mode.kind === "create") {
        const result = await createDraft(inputs());
        if (result.success) {
          setFeedback({ kind: "ok", message: tForm("feedback.draftCreated") });
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
          setFeedback({ kind: "ok", message: tForm("feedback.draftSaved") });
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
          message: tForm("feedback.submitted"),
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
            {tForm("rejectionHeading")}
          </p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{mode.rejectionReason}</p>
        </div>
      )}

      <Field
        label={tForm("fields.titleLabel")}
        error={fieldError("title")}
        hint={tForm("fields.titleHint")}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-base text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          placeholder={tForm("fields.titlePlaceholder")}
        />
      </Field>

      <Field
        label={tForm("fields.descriptionLabel")}
        error={fieldError("description")}
        hint={tForm("fields.descriptionHint")}
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={158}
          rows={2}
          className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          placeholder={tForm("fields.descriptionPlaceholder")}
        />
        <p className="mt-1 text-[11px] text-bh-fg-3">
          {tForm("fields.descriptionCounter", { count: description.length })}
        </p>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        {mode.kind === "create" ? (
          <Field
            label={tForm("fields.localeLabel")}
            hint={tForm("fields.localeHint")}
          >
            <select
              value={postLocale}
              onChange={(e) => setPostLocale(e.target.value as typeof postLocale)}
              className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
            >
              <option value="es">{tForm("fields.localeEs")}</option>
              <option value="en">{tForm("fields.localeEn")}</option>
              <option value="it">{tForm("fields.localeIt")}</option>
              <option value="pt">{tForm("fields.localePt")}</option>
            </select>
          </Field>
        ) : null}

        <Field
          label={tForm("fields.clusterLabel")}
          error={fieldError("cluster")}
          hint={tForm("fields.clusterHint")}
        >
          <select
            value={cluster}
            onChange={(e) => setCluster(e.target.value as BlogCluster)}
            className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
          >
            {(Object.keys(CLUSTER_LABELS) as BlogCluster[]).map((value) => (
              <option key={value} value={value}>
                {t(`clusters.${value}` as const)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={tForm("fields.tagsLabel")}
          error={fieldError("tags")}
          hint={tForm("fields.tagsHint")}
        >
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-1 px-4 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
            placeholder={tForm("fields.tagsPlaceholder")}
          />
        </Field>
      </div>

      <Field
        label={tForm("fields.heroLabel")}
        error={fieldError("heroImageUrl") ?? heroError ?? undefined}
        hint={tForm("fields.heroHint")}
      >
        <input
          ref={heroFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleHeroFile}
          className="hidden"
          aria-hidden
        />
        {heroImageUrl ? (
          <div className="relative overflow-hidden rounded-bh-md border border-bh-fg-4 bg-bh-surface-2">
            {/*
              Plain <img> inline para preview en el editor (client side).
              El render público en /blog/[slug] usa next/image porque
              todas las imágenes nuevas viven en *.supabase.co.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt={tForm("fields.heroPreviewAlt")}
              className="block aspect-[16/9] w-full object-cover"
            />
            <div className="flex items-center justify-end gap-2 border-t border-bh-fg-4 bg-bh-surface-1 p-2">
              <button
                type="button"
                onClick={triggerHeroUpload}
                disabled={heroUploading}
                className="rounded-bh-sm border border-bh-fg-4 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-bh-fg-2 transition-colors hover:border-bh-fg-3 hover:text-bh-fg-1 disabled:opacity-50"
              >
                {heroUploading
                  ? tForm("fields.heroChangeUploading")
                  : tForm("fields.heroChange")}
              </button>
              <button
                type="button"
                onClick={clearHero}
                disabled={heroUploading}
                className="inline-flex items-center gap-1 rounded-bh-sm border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-red-300 transition-colors hover:border-red-400 hover:text-red-200 disabled:opacity-50"
              >
                <X className="size-3" aria-hidden />
                {tForm("fields.heroRemove")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={triggerHeroUpload}
            disabled={heroUploading}
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-bh-md border border-dashed border-bh-fg-4 bg-bh-surface-1 text-sm text-bh-fg-3 transition-colors hover:border-bh-fg-3 hover:text-bh-fg-2 disabled:opacity-50"
          >
            {heroUploading ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                <span>{tForm("fields.heroUploading")}</span>
              </>
            ) : (
              <>
                <ImageIcon className="size-6" aria-hidden />
                <span>{tForm("fields.heroUploadCta")}</span>
                <span className="text-[11px] text-bh-fg-3">
                  {tForm("fields.heroUploadFormats")}
                </span>
              </>
            )}
          </button>
        )}
      </Field>

      <Field
        label={tForm("fields.contentLabel")}
        error={fieldError("contentHtml")}
        hint={tForm("fields.contentHint")}
      >
        <RichTextEditor
          initialContent={initialValues?.contentHtml ?? ""}
          onChange={setContentHtml}
          placeholder={tForm("fields.contentPlaceholder")}
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
          {feedback.kind === "saving"
            ? tForm("actions.saving")
            : tForm("actions.save")}
        </button>
        {canSubmit && (
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={isPending}
            className="rounded-bh-md bg-bh-lime px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-bh-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {feedback.kind === "submitting"
              ? tForm("actions.submitting")
              : tForm("actions.submit")}
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
