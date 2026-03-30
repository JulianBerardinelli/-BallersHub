"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import type { PlayerMedia } from "@/db/schema/media";

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
      <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 text-sm text-neutral-500">
        <svg className="mb-2 h-8 w-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>No tienes archivos multimedia cargados todavía.</p>
      </div>
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
            className={`group relative flex flex-col overflow-hidden rounded-xl border transition-colors ${
               isFlagged
                ? "border-red-900 bg-red-950/20"
                : "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/80"
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
                  <Chip color="danger" size="sm" variant="flat">
                    Inapropiado (Oculto)
                  </Chip>
                )}
                {isPending && (
                  <Chip color="warning" size="sm" variant="flat">
                    En Revisión
                  </Chip>
                )}
                {item.isPrimary && !isFlagged && (
                  <Chip color="primary" size="sm" variant="solid">
                    Foto Principal / Portada
                  </Chip>
                )}
              </div>
            </div>

            {/* Content & Actions */}
            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="mb-4">
                <p className="font-semibold text-white truncate" title={item.title || "Sin título"}>
                  {item.title || (item.type === "photo" ? "Fotografía sin título" : "Video sin título")}
                </p>
                <p className="text-xs text-neutral-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
                {isFlagged && (
                  <p className="mt-2 text-xs text-red-400">
                    Este archivo incumple las normas de la comunidad y no es visible en el perfil público. 
                    Por favor, elimínalo.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-neutral-800">
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  className="w-full flex-1"
                  onPress={() => handleDelete(item.id)}
                  isLoading={deletingId === item.id}
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
