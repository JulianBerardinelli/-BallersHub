"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { ImageOff, ChevronUp, ChevronDown } from "lucide-react";
import type { PlayerMedia } from "@/db/schema/media";

import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip } from "@/lib/ui/heroui-brand";

export default function MediaGalleryGrid({
  items,
  reorderable = false,
  onMoveUp,
  onMoveDown,
  isReordering = false,
}: {
  items: PlayerMedia[];
  /** Show up/down controls to reorder items (videos only). */
  reorderable?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  /** Disables all reorder controls while a save is in flight. */
  isReordering?: boolean;
}) {
  const t = useTranslations("dashEditProfile");
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(t("media.galleryGrid.confirmDelete"))) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(t("media.galleryGrid.deleteFetchError"));
      }
      router.refresh(); // Soft refresh to reflect changes
    } catch (err) {
      console.error(err);
      alert(t("media.galleryGrid.deleteFallbackError"));
    } finally {
      setDeletingId(null);
    }
  };

  if (!items || items.length === 0) {
    return (
      <BhEmptyState
        icon={<ImageOff className="h-5 w-5" />}
        title={t("media.galleryGrid.emptyTitle")}
        description={t("media.galleryGrid.emptyDescription")}
      />
    );
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const isFlagged = item.isFlagged;
        const isPending = !item.isApproved && !item.isFlagged;
        const showReorder = reorderable && items.length > 1 && !!onMoveUp && !!onMoveDown;

        return (
          <div
            key={item.id}
            className={`group relative flex flex-col overflow-hidden rounded-bh-lg border transition-colors ${
              isFlagged
                ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]"
                : "border-white/[0.08] bg-bh-surface-1 hover:border-white/[0.18]"
            }`}
          >
            {/* Aspect Video Wrapper */}
            <div className="relative aspect-video w-full bg-black">
              {item.type === "photo" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.title || t("media.galleryGrid.photoAltFallback")}
                  className={`h-full w-full object-cover transition-opacity ${
                     isFlagged ? "opacity-30 grayscale" : "opacity-90 group-hover:opacity-100"
                  }`}
                />
              )}

              {item.type === "video" && item.provider === "youtube" ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={getYouTubeEmbedUrl(item.url) || ""}
                  title={t("media.galleryGrid.videoPlayerTitle")}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : item.type === "video" ? (
                <video src={item.url} className="h-full w-full object-contain" controls />
              ) : null}

              {/* Status Badges Overlay */}
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                {isFlagged && (
                  <Chip size="sm" variant="flat" classNames={bhChip("danger")}>
                    {t("media.galleryGrid.chipFlagged")}
                  </Chip>
                )}
                {isPending && (
                  <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                    {t("media.galleryGrid.chipPending")}
                  </Chip>
                )}
                {item.isPrimary && !isFlagged && (
                  <Chip size="sm" variant="flat" classNames={bhChip("lime")}>
                    {t("media.galleryGrid.chipPrimary")}
                  </Chip>
                )}
              </div>
            </div>

            {/* Content & Actions */}
            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="mb-3">
                <p
                  className="truncate font-bh-heading text-[14px] font-semibold text-bh-fg-1"
                  title={item.title || t("media.galleryGrid.titleNoTitle")}
                >
                  {item.title ||
                    (item.type === "photo"
                      ? t("media.galleryGrid.titlePhotoUntitled")
                      : t("media.galleryGrid.titleVideoUntitled"))}
                </p>
                <p className="font-bh-mono text-[11px] text-bh-fg-4">
                  {item.type === "video" && item.seasonYear
                    ? `${t("media.galleryGrid.seasonPrefix")} ${item.seasonYear} · ${new Date(item.createdAt).toLocaleDateString()}`
                    : new Date(item.createdAt).toLocaleDateString()}
                </p>
                {isFlagged && (
                  <p className="mt-2 text-[11px] text-bh-danger">
                    {t("media.galleryGrid.flaggedNotice")}
                  </p>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-3">
                {showReorder && (
                  <>
                    <button
                      type="button"
                      aria-label={t("media.galleryGrid.moveUpAria")}
                      disabled={index === 0 || isReordering}
                      onClick={() => onMoveUp?.(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-bh-md border border-white/[0.08] text-bh-fg-3 transition-colors hover:border-white/[0.18] hover:text-bh-fg-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.08]"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("media.galleryGrid.moveDownAria")}
                      disabled={index === items.length - 1 || isReordering}
                      onClick={() => onMoveDown?.(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-bh-md border border-white/[0.08] text-bh-fg-3 transition-colors hover:border-white/[0.18] hover:text-bh-fg-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.08]"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => handleDelete(item.id)}
                  isLoading={deletingId === item.id}
                  className={bhButtonClass({ variant: "danger-soft", size: "sm", className: "flex-1" })}
                >
                  {deletingId === item.id
                    ? t("media.galleryGrid.deleting")
                    : t("media.galleryGrid.delete")}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
