"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import { UploadCloud, Trash2, AlertCircle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

import SquooshHint from "./SquooshHint";
import AvatarCropperModal from "./AvatarCropperModal";
import { bhButtonClass } from "@/components/ui/bh-button-class";

type Props = {
  bucket: string;
  /** Path inside the bucket. Receives the file (after cropping if enabled). */
  pathFor: (file: File) => string;
  currentUrl: string | null;
  /** Called once the public URL is available. Implementer persists it. */
  onUploaded: (publicUrl: string) => void | Promise<void>;
  /** Optional remove handler. If provided, a small "remove" affordance is shown. */
  onRemove?: () => void | Promise<void>;
  /** Max file size in bytes. Default 2 MB. */
  maxBytes?: number;
  /** Accept list, default image only. */
  accept?: string;
  /** Visual variant: "circle" for avatars, "square" for thumbnails. */
  shape?: "circle" | "square";
  /** Frame size in px. Default 96 (avatar). */
  size?: number;
  /** Replace built-in fallback when no image is set. */
  emptyLabel?: string;
  /**
   * Open a circular cropper modal after the user picks a file. Lets them
   * zoom/pan and produces a square JPEG. Defaults to true when shape="circle".
   */
  enableCrop?: boolean;
  /** Output square size for the crop, in pixels. Default 480. */
  cropOutputSize?: number;
};

export default function BhImageUploader({
  bucket,
  pathFor,
  currentUrl,
  onUploaded,
  onRemove,
  maxBytes = 2 * 1024 * 1024,
  accept = "image/jpeg,image/png,image/webp",
  shape = "circle",
  size = 96,
  emptyLabel = "Sin foto",
  enableCrop,
  cropOutputSize = 480,
}: Props) {
  const cropEnabled = enableCrop ?? shape === "circle";

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const validate = (file: File): string | null => {
    if (!file.type.startsWith("image/")) return "Por favor, seleccioná una imagen válida.";
    if (file.size > maxBytes) {
      return `La imagen pesa ${formatBytes(file.size)}. Reducila a ${formatBytes(maxBytes)} o menos. Probá comprimir en squoosh.app.`;
    }
    return null;
  };

  const upload = async (blob: Blob, originalName: string, mime: string) => {
    setIsUploading(true);
    setError(null);
    try {
      // Materialize the blob as a File so callers' `pathFor` keeps working
      // with the original filename.
      const fileForPath = new File([blob], originalName, { type: mime });
      const path = pathFor(fileForPath);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: mime });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const cacheBusted = `${pub.publicUrl}?v=${Date.now()}`;
      await onUploaded(cacheBusted);
    } catch (err) {
      console.error("Image upload error", err);
      setError(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validate(file);
    if (validation) {
      setError(validation);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError(null);

    if (cropEnabled) {
      setPickedFile(file);
      setCropperOpen(true);
      return;
    }

    await upload(file, file.name, file.type);
  };

  const radiusClass = shape === "circle" ? "rounded-full" : "rounded-bh-md";
  const dimensionStyle = { height: size, width: size };

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-white/[0.08] bg-bh-surface-2 ${radiusClass}`}
          style={dimensionStyle}
        >
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt="Imagen actual"
              fill
              sizes={`${size}px`}
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-[11px] text-bh-fg-4 px-2 text-center">{emptyLabel}</span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <input
            type="file"
            accept={accept}
            className="hidden"
            ref={fileInputRef}
            onChange={handleFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              isLoading={isUploading}
              startContent={!isUploading && <UploadCloud className="size-4" />}
              onPress={() => fileInputRef.current?.click()}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              {currentUrl ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {currentUrl && onRemove && (
              <Button
                size="sm"
                variant="flat"
                isIconOnly
                aria-label="Quitar imagen"
                onPress={async () => {
                  try {
                    await onRemove();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo quitar la imagen.");
                  }
                }}
                className={bhButtonClass({ variant: "danger-soft", size: "sm", iconOnly: true })}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-2 text-xs text-bh-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <SquooshHint maxBytes={maxBytes} accept={accept} />

      {cropEnabled && (
        <AvatarCropperModal
          isOpen={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) {
              setPickedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }}
          file={pickedFile}
          outputSize={cropOutputSize}
          onConfirm={async (blob) => {
            const baseName = pickedFile?.name?.replace(/\.[^.]+$/, "") || "avatar";
            await upload(blob, `${baseName}.jpg`, "image/jpeg");
          }}
        />
      )}
    </div>
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
