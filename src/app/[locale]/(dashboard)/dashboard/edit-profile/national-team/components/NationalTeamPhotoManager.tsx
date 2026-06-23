"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ImagePlus, Loader2 } from "lucide-react";

import type { PlayerMedia } from "@/db/schema/media";
import MediaGalleryGrid from "@/components/dashboard/client/media/MediaGalleryGrid";
import { useReorderable } from "@/components/dashboard/client/media/useReorderable";
import { bhButtonClass } from "@/components/ui/BhButton";
import { NT_PHOTO_CAP } from "@/lib/dashboard/national-team";

export type NationalTeamPhotoView = {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isApproved: boolean;
  isFlagged: boolean;
  reviewedBy: string | null;
  createdAt: string | null;
};

const API_BASE = "/api/media/national-team";
const UPLOAD_URL = "/api/media/upload/national-team";

// Catálogo de fotos del bloque Selección (cap 4 TOTAL). Reusa MediaGalleryGrid
// + useReorderable. Las fotos nacen sin aprobar (badge "pendiente" en el grid);
// el dueño las ve pero no son públicas hasta que el admin las valida.
export default function NationalTeamPhotoManager({
  playerId,
  media,
}: {
  playerId: string;
  media: NationalTeamPhotoView[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapeo a la forma PlayerMedia que espera MediaGalleryGrid.
  const gridItems: PlayerMedia[] = media.map((m) => ({
    id: m.id,
    playerId,
    type: "photo",
    url: m.url,
    title: null,
    altText: m.altText,
    tags: null,
    provider: null,
    seasonYear: null,
    position: m.position,
    isPrimary: false,
    isApproved: m.isApproved,
    isFlagged: m.isFlagged,
    reviewedBy: m.reviewedBy,
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
  }));

  const { ordered, isSaving, moveUp, moveDown } = useReorderable(gridItems, `${API_BASE}/reorder`);

  const atCap = media.length >= NT_PHOTO_CAP;

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo subir la foto.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Fotos del bloque</h4>
          <p className="text-xs text-bh-fg-3">
            Hasta {NT_PHOTO_CAP} fotos generales con la selección (entrenando, jugando, etc.).
            Las revisamos antes de publicarlas.
          </p>
        </div>
        <span className="text-xs font-medium text-bh-fg-4">
          {media.length}/{NT_PHOTO_CAP}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <Button
        type="button"
        size="sm"
        className={bhButtonClass({ variant: "outline", size: "sm" })}
        isDisabled={atCap || uploading}
        onPress={() => fileInputRef.current?.click()}
        startContent={
          uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />
        }
      >
        {uploading ? "Subiendo…" : atCap ? "Límite alcanzado" : "Subir foto"}
      </Button>

      {error ? <p className="text-xs text-bh-danger">{error}</p> : null}

      <MediaGalleryGrid
        items={ordered}
        reorderable
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        isReordering={isSaving}
        apiBase={API_BASE}
      />
    </div>
  );
}
