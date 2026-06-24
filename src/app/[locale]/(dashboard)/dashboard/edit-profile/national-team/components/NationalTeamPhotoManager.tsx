"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ImagePlus, Loader2, X } from "lucide-react";

import type { PlayerMedia } from "@/db/schema/media";
import MediaGalleryGrid from "@/components/dashboard/client/media/MediaGalleryGrid";
import { useReorderable } from "@/components/dashboard/client/media/useReorderable";
import { bhButtonClass } from "@/components/ui/BhButton";
import { NT_PHOTO_CAP } from "@/lib/dashboard/national-team";

export type NationalTeamPhotoView = {
  id: string;
  url: string;
  title: string | null;
  altText: string | null;
  position: number;
  isApproved: boolean;
  isFlagged: boolean;
  reviewedBy: string | null;
  createdAt: string | null;
};

const API_BASE = "/api/media/national-team";
const UPLOAD_URL = "/api/media/upload/national-team";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-bh-lime/50 focus:outline-none";

// Catálogo de fotos del bloque Selección (cap 4 TOTAL). Reusa MediaGalleryGrid
// + useReorderable. Flujo de subida con preview + título opcional por foto.
export default function NationalTeamPhotoManager({
  playerId,
  media,
}: {
  playerId: string;
  media: NationalTeamPhotoView[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapeo a la forma PlayerMedia que espera MediaGalleryGrid (incluye title).
  const gridItems: PlayerMedia[] = media.map((m) => ({
    id: m.id,
    playerId,
    type: "photo",
    url: m.url,
    title: m.title,
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

  const clearPending = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(null);
    setPreview(null);
    setTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickFile = (file: File) => {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      if (title.trim()) formData.append("title", title.trim());
      const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo subir la foto.");
      }
      clearPending();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Fotos del bloque</h4>
          <p className="text-xs text-bh-fg-3">
            Hasta {NT_PHOTO_CAP} fotos generales con la selección (entrenando, jugando, etc.).
            Podés ponerle un título a cada una.
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
          if (file) onPickFile(file);
        }}
      />

      {/* Subida pendiente: preview + título antes de confirmar */}
      {pendingFile && preview ? (
        <div className="flex flex-col gap-3 rounded-xl border border-bh-lime/20 bg-white/[0.02] p-3 sm:flex-row sm:items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Vista previa"
            className="h-24 w-24 shrink-0 rounded-lg object-cover"
          />
          <div className="flex-1 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/70">Título (opcional)</label>
              <input
                className={fieldClass}
                placeholder="Ej. Debut con la Sub-20 vs Brasil"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className={bhButtonClass({ variant: "lime", size: "sm" })}
                isDisabled={uploading}
                onPress={handleUpload}
                startContent={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
              >
                {uploading ? "Subiendo…" : "Subir foto"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="light"
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
                isDisabled={uploading}
                onPress={clearPending}
                startContent={<X className="h-4 w-4" />}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className={bhButtonClass({ variant: "outline", size: "sm" })}
          isDisabled={atCap}
          onPress={() => fileInputRef.current?.click()}
          startContent={<ImagePlus className="h-4 w-4" />}
        >
          {atCap ? "Límite alcanzado" : "Agregar foto"}
        </Button>
      )}

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
