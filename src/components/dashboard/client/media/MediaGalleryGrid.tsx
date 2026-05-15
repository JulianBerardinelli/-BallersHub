"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { ImageOff } from "lucide-react";
import type { PlayerMedia } from "@/db/schema/media";

import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip } from "@/lib/ui/heroui-brand";

export default function MediaGalleryGrid({ items }: { items: PlayerMedia[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este archivo?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("No se pudo eliminar el archivo. Intenta de nuevo.");
      }
      router.refresh(); // Soft refresh to reflect changes
    } catch (err) {
      console.error(err);
      alert("Hubo un error borrando el archivo.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!items || items.length === 0) {
    return (
      <BhEmptyState
        icon={<ImageOff className="h-5 w-5" />}
        title="Sin archivos"
        description="No tenés archivos multimedia cargados todavía."
      />
    );
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isFlagged = item.isFlagged;
        const isPending = !item.isApproved && !item.isFlagged;

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
                  alt={item.title || "Foto de perfil"}
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
                  title="YouTube video player"
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
                    Inapropiado (oculto)
                  </Chip>
                )}
                {isPending && (
                  <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                    En revisión
                  </Chip>
                )}
                {item.isPrimary && !isFlagged && (
                  <Chip size="sm" variant="flat" classNames={bhChip("lime")}>
                    Foto principal
                  </Chip>
                )}
              </div>
            </div>

            {/* Content & Actions */}
            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="mb-3">
                <p
                  className="truncate font-bh-heading text-[14px] font-semibold text-bh-fg-1"
                  title={item.title || "Sin título"}
                >
                  {item.title || (item.type === "photo" ? "Fotografía sin título" : "Video sin título")}
                </p>
                <p className="font-bh-mono text-[11px] text-bh-fg-4">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
                {isFlagged && (
                  <p className="mt-2 text-[11px] text-bh-danger">
                    Este archivo incumple las normas de la comunidad y no es
                    visible en el perfil público. Por favor, eliminalo.
                  </p>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-3">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => handleDelete(item.id)}
                  isLoading={deletingId === item.id}
                  className={bhButtonClass({ variant: "danger-soft", size: "sm", className: "w-full flex-1" })}
                >
                  {deletingId === item.id ? "Borrando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
